import type { McpServerConfig, McpTransport } from "@/lib/mcp-types";

const STORAGE_KEY = "ai-chat:mcp-servers:v1";

// --- localStorage ---

export function loadMcpServers(): McpServerConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as McpServerConfig[]).map((s) => ({ ...s, status: "disconnected" }));
  } catch {
    return [];
  }
}

export function saveMcpServers(servers: McpServerConfig[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
  } catch {
    // ignore quota errors
  }
}

// --- 표준 mcp.json 변환 ---

interface StdioEntry {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
interface HttpEntry {
  url: string;
  headers?: Record<string, string>;
}
type McpJsonEntry = StdioEntry | HttpEntry;
interface McpJson {
  mcpServers: Record<string, McpJsonEntry>;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function toMcpJson(servers: McpServerConfig[]): McpJson {
  const mcpServers: Record<string, McpJsonEntry> = {};
  for (const s of servers) {
    if (s.transport === "stdio" && s.command) {
      const entry: StdioEntry = { command: s.command };
      if (s.args?.length) entry.args = s.args;
      if (s.env && Object.keys(s.env).length) entry.env = s.env;
      mcpServers[s.name] = entry;
    } else if (s.transport === "http" && s.url) {
      const entry: HttpEntry = { url: s.url };
      if (s.headers && Object.keys(s.headers).length) entry.headers = s.headers;
      mcpServers[s.name] = entry;
    }
  }
  return { mcpServers };
}

export function fromMcpJson(json: unknown): McpServerConfig[] {
  if (typeof json !== "object" || json === null) throw new Error("유효하지 않은 JSON 형식입니다.");
  const obj = json as Record<string, unknown>;
  if (typeof obj.mcpServers !== "object" || obj.mcpServers === null) {
    throw new Error('"mcpServers" 키가 없거나 잘못된 형식입니다.');
  }
  const entries = obj.mcpServers as Record<string, unknown>;
  const result: McpServerConfig[] = [];
  for (const [name, raw] of Object.entries(entries)) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Record<string, unknown>;
    let transport: McpTransport;
    if (typeof entry.url === "string") {
      transport = "http";
    } else if (typeof entry.command === "string") {
      transport = "stdio";
    } else {
      continue;
    }
    const server: McpServerConfig = { id: generateId(), name, transport, status: "disconnected" };
    if (transport === "stdio") {
      server.command = entry.command as string;
      if (Array.isArray(entry.args)) server.args = entry.args as string[];
      if (typeof entry.env === "object" && entry.env !== null) {
        server.env = entry.env as Record<string, string>;
      }
    } else {
      server.url = entry.url as string;
      if (typeof entry.headers === "object" && entry.headers !== null) {
        server.headers = entry.headers as Record<string, string>;
      }
    }
    result.push(server);
  }
  if (result.length === 0) throw new Error("가져올 수 있는 서버 항목이 없습니다.");
  return result;
}
