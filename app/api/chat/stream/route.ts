import { NextRequest } from "next/server";
import { mcpToTool } from "@google/genai";
import type { CallableTool, Content } from "@google/genai";
import { getGeminiClient, MODEL } from "@/lib/gemini";
import { getMcpClients } from "@/lib/server/mcp-manager";
import type { Message } from "@/lib/types";

export const runtime = "nodejs";

interface RequestBody {
  messages: Message[];
  enabledServerIds?: string[];
}

function toGeminiContents(messages: Message[]): Content[] {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

function sseChunk(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function mapError(err: unknown): { code: string; message: string } {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("GEMINI_API_KEY")) {
    return { code: "AUTH_MISSING", message: "API 키가 설정되지 않았습니다. .env.local의 GEMINI_API_KEY를 확인해 주세요." };
  }
  if (msg.includes("401") || msg.includes("403") || msg.includes("API_KEY_INVALID")) {
    return { code: "AUTH_INVALID", message: "API 키가 유효하지 않습니다. 키를 다시 확인해 주세요." };
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return { code: "QUOTA_EXCEEDED", message: "요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요." };
  }
  if (msg.includes("5") && msg.match(/5\d{2}/)) {
    return { code: "SERVER_ERROR", message: "Gemini 서버에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }
  return { code: "UNKNOWN", message: "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RequestBody;
  const { messages, enabledServerIds = [] } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages가 필요합니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contents = toGeminiContents(messages);

  // 활성화된 MCP 클라이언트 수집
  const mcpEntries = enabledServerIds.length ? getMcpClients(enabledServerIds) : [];
  const hasMcpTools = mcpEntries.length > 0;

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (s: string) => new TextEncoder().encode(s);

      try {
        const ai = getGeminiClient();

        const mcpTool: CallableTool | undefined = hasMcpTools
          // mcpToTool accepts variadic Clients; cast to bypass TS tuple constraint
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? (mcpToTool as (...args: any[]) => CallableTool)(...mcpEntries.map((e) => e.client))
          : undefined;

        const streamConfig = mcpTool
          ? {
              tools: [mcpTool],
              automaticFunctionCalling: { maximumRemoteCalls: 5 },
            }
          : undefined;

        const response = await ai.models.generateContentStream({
          model: MODEL,
          contents,
          ...(streamConfig ? { config: streamConfig } : {}),
        });

        for await (const chunk of response) {
          if (request.signal.aborted) break;

          const content = chunk.candidates?.[0]?.content;

          // 도구 실행 결과 (AFC가 자동으로 MCP를 호출한 후 합성하는 청크)
          if (content?.role === "user") {
            for (const part of content.parts ?? []) {
              if (part.functionResponse) {
                controller.enqueue(
                  encode(
                    sseChunk({
                      toolResult: {
                        name: part.functionResponse.name,
                        response: part.functionResponse.response,
                      },
                    }),
                  ),
                );
              }
            }
            continue;
          }

          // 도구 호출 요청 (AFC가 자동 실행하기 전에 surface)
          const calls = chunk.functionCalls;
          if (calls?.length) {
            for (const call of calls) {
              controller.enqueue(
                encode(
                  sseChunk({
                    toolCall: {
                      name: call.name,
                      args: call.args,
                    },
                  }),
                ),
              );
            }
          }

          // 일반 텍스트
          const text = chunk.text;
          if (text) {
            controller.enqueue(encode(sseChunk({ text })));
          }
        }

        controller.enqueue(encode("data: [DONE]\n\n"));
      } catch (err) {
        const error = mapError(err);
        controller.enqueue(encode(sseChunk({ error })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
