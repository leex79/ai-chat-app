export type McpTransport = "stdio" | "http";
export type McpStatus = "disconnected" | "connecting" | "connected" | "error";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: McpTransport;
  // stdio
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // http/sse
  url?: string;
  headers?: Record<string, string>;
  status: McpStatus;
  errorMessage?: string;
}

export interface McpCapabilities {
  tools: McpTool[];
  prompts: McpPrompt[];
  resources: McpResource[];
}

/** string 입력을 JSON 파싱해 숫자/불리언/객체 등으로 변환, 실패 시 원본 string 반환 */
export function parseArgValue(value: string): unknown {
  if (value === "") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** { [key]: string } 형태의 args 폼 값을 실제 MCP 인자 객체로 변환 */
export function buildToolArgs(
  formValues: Record<string, string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(formValues).map(([k, v]) => [k, parseArgValue(v)]),
  );
}

export interface McpToolInputProperty {
  type: string;
  description?: string;
  enum?: string[];
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: "object";
    properties?: Record<string, McpToolInputProperty>;
    required?: string[];
  };
}

export interface McpPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: McpPromptArgument[];
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpToolResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

export interface McpPromptResult {
  messages: { role: "user" | "assistant"; content: { type: "text"; text: string } }[];
}
