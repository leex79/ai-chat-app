import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpServerConfig, McpCapabilities, McpTool, McpPrompt, McpResource } from "@/lib/mcp-types";

interface McpEntry {
  client: Client;
  transport: StdioClientTransport | StreamableHTTPClientTransport;
  capabilities: McpCapabilities;
}

// globalThis 싱글톤 — dev HMR 재시작에도 연결 유지
declare global {
  // eslint-disable-next-line no-var
  var __mcpClients: Map<string, McpEntry> | undefined;
}

function getClientMap(): Map<string, McpEntry> {
  if (!globalThis.__mcpClients) {
    globalThis.__mcpClients = new Map();
  }
  return globalThis.__mcpClients;
}

function mapError(err: unknown): { code: string; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("ENOENT") || msg.includes("spawn")) {
    return { code: "SPAWN_FAILED", message: `명령어를 찾을 수 없습니다. command/args 설정을 확인해 주세요. (${msg})` };
  }
  if (msg.includes("ECONNREFUSED") || msg.includes("ECONNRESET") || msg.includes("fetch")) {
    return { code: "CONNECT_FAILED", message: `서버에 연결할 수 없습니다. URL과 서버 상태를 확인해 주세요. (${msg})` };
  }
  if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized")) {
    return { code: "AUTH_FAILED", message: `인증에 실패했습니다. headers(Authorization 등)를 확인해 주세요.` };
  }
  if (msg.includes("timeout") || msg.includes("Timeout")) {
    return { code: "TIMEOUT", message: `연결 시간이 초과됐습니다. 서버가 응답하는지 확인해 주세요.` };
  }
  return { code: "UNKNOWN", message: `연결 중 오류가 발생했습니다: ${msg}` };
}

function buildStdioTransport(config: McpServerConfig): StdioClientTransport {
  const command = config.command!;
  const userArgs = config.args ?? [];

  let finalCommand: string;
  let finalArgs: string[];

  // Windows: npx/node 등 PATH 명령어는 cmd /c 로 래핑
  if (
    process.platform === "win32" &&
    !command.startsWith("/") &&
    !command.startsWith("C:\\") &&
    !command.match(/^[A-Za-z]:\\/)
  ) {
    finalCommand = "cmd";
    finalArgs = ["/c", command, ...userArgs];
  } else {
    finalCommand = command;
    finalArgs = userArgs;
  }

  return new StdioClientTransport({
    command: finalCommand,
    args: finalArgs,
    env: { ...getDefaultEnvironment(), ...(config.env ?? {}) },
  });
}

function buildHttpTransport(config: McpServerConfig): StreamableHTTPClientTransport {
  const url = new URL(config.url!);
  const headers = config.headers ?? {};
  return new StreamableHTTPClientTransport(url, {
    requestInit: Object.keys(headers).length ? { headers } : undefined,
  });
}

export async function mcpConnect(config: McpServerConfig): Promise<McpCapabilities> {
  const map = getClientMap();

  // 기존 연결이 있으면 먼저 정리
  if (map.has(config.id)) {
    await mcpDisconnect(config.id).catch(() => {});
  }

  const client = new Client({ name: "ai-chat-mcp-client", version: "1.0.0" });
  const transport =
    config.transport === "stdio"
      ? buildStdioTransport(config)
      : buildHttpTransport(config);

  try {
    await client.connect(transport);
  } catch (err) {
    const { code, message } = mapError(err);
    throw Object.assign(new Error(message), { code });
  }

  const capabilities = await getCapabilitiesFor(config.id, client);
  map.set(config.id, { client, transport, capabilities });
  return capabilities;
}

async function getCapabilitiesFor(id: string, client: Client): Promise<McpCapabilities> {
  const tools: McpTool[] = [];
  const prompts: McpPrompt[] = [];
  const resources: McpResource[] = [];

  try {
    let cursor: string | undefined;
    do {
      const res = await client.listTools({ cursor });
      for (const t of res.tools) {
        tools.push({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema as McpTool["inputSchema"],
        });
      }
      cursor = res.nextCursor;
    } while (cursor);
  } catch {
    // 서버가 tools를 지원하지 않으면 무시
  }

  try {
    let cursor: string | undefined;
    do {
      const res = await client.listPrompts({ cursor });
      for (const p of res.prompts) {
        prompts.push({
          name: p.name,
          description: p.description,
          arguments: p.arguments?.map((a) => ({
            name: a.name,
            description: a.description,
            required: a.required,
          })),
        });
      }
      cursor = res.nextCursor;
    } while (cursor);
  } catch {
    // 서버가 prompts를 지원하지 않으면 무시
  }

  try {
    let cursor: string | undefined;
    do {
      const res = await client.listResources({ cursor });
      for (const r of res.resources) {
        resources.push({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        });
      }
      cursor = res.nextCursor;
    } while (cursor);
  } catch {
    // 서버가 resources를 지원하지 않으면 무시
  }

  void id;
  return { tools, prompts, resources };
}

export async function mcpDisconnect(id: string): Promise<void> {
  const map = getClientMap();
  const entry = map.get(id);
  if (!entry) return;
  try {
    await entry.client.close();
  } catch {
    // 이미 닫혔을 수 있으므로 무시
  }
  map.delete(id);
}

function requireClient(id: string): Client {
  const entry = getClientMap().get(id);
  if (!entry) {
    const err = new Error("서버가 연결되어 있지 않습니다. 다시 연결해 주세요.");
    Object.assign(err, { code: "NOT_CONNECTED" });
    throw err;
  }
  return entry.client;
}

export async function mcpCallTool(
  id: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: { type: string; text?: string }[]; isError?: boolean }> {
  const client = requireClient(id);
  try {
    const result = await client.callTool({ name, arguments: args });
    return {
      content: (result.content ?? []) as { type: string; text?: string }[],
      isError: result.isError === true,
    };
  } catch (err) {
    const { message } = mapError(err);
    return { content: [{ type: "text", text: `오류: ${message}` }], isError: true };
  }
}

export async function mcpGetPrompt(
  id: string,
  name: string,
  args: Record<string, string>,
): Promise<{ messages: { role: string; content: { type: string; text?: string } }[] }> {
  const client = requireClient(id);
  try {
    const result = await client.getPrompt({ name, arguments: args });
    return {
      messages: result.messages.map((m) => ({
        role: m.role,
        content: m.content as { type: string; text?: string },
      })),
    };
  } catch (err) {
    const { message } = mapError(err);
    throw new Error(message);
  }
}

export function getMcpClients(ids: string[]): { id: string; client: Client }[] {
  const map = getClientMap();
  return ids.flatMap((id) => {
    const entry = map.get(id);
    return entry ? [{ id, client: entry.client }] : [];
  });
}

export async function mcpListSessions(): Promise<{ id: string; capabilities: McpCapabilities }[]> {
  const map = getClientMap();
  const results: { id: string; capabilities: McpCapabilities }[] = [];
  const deadIds: string[] = [];

  for (const [id, entry] of map.entries()) {
    let alive = false;
    try {
      await entry.client.ping();
      alive = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // 연결 자체가 닫힌 경우에만 dead로 처리, 그 외(ping 미지원 등)는 alive로 간주
      if (
        msg.includes("closed") ||
        msg.includes("disconnected") ||
        msg.includes("EPIPE") ||
        msg.includes("EOF")
      ) {
        alive = false;
      } else {
        alive = true;
      }
    }

    if (alive) {
      results.push({ id, capabilities: entry.capabilities });
    } else {
      deadIds.push(id);
    }
  }

  for (const id of deadIds) {
    map.delete(id);
  }

  return results;
}

export async function mcpReadResource(
  id: string,
  uri: string,
): Promise<{ contents: { uri: string; text?: string; mimeType?: string }[] }> {
  const client = requireClient(id);
  try {
    const result = await client.readResource({ uri });
    return {
      contents: result.contents.map((c) => ({
        uri: c.uri,
        text: "text" in c ? (c.text as string) : undefined,
        mimeType: c.mimeType,
      })),
    };
  } catch (err) {
    const { message } = mapError(err);
    throw new Error(message);
  }
}
