export type Role = "user" | "assistant";

export type ToolInvocationStatus = "calling" | "done" | "error";

export interface ToolInvocation {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  result?: unknown;
  status: ToolInvocationStatus;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  toolCalls?: ToolInvocation[];
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
