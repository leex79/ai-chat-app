import { getSupabaseClient } from "@/lib/supabase/client";
import type { Message, Session, ToolInvocation } from "@/lib/types";

// ---- 행 타입 ----

interface SessionRow {
  id: string;
  device_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  session_id: string;
  device_id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls: ToolInvocation[] | null;
  created_at: string;
}

// ---- 매핑 ----

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: new Date(row.created_at).getTime(),
    toolCalls: row.tool_calls ?? undefined,
  };
}

function rowToSession(row: SessionRow, messages: Message[]): Session {
  return {
    id: row.id,
    title: row.title,
    messages,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

// ---- 세션 CRUD ----

export async function listSessions(deviceId: string): Promise<Session[]> {
  const db = getSupabaseClient();

  const { data: sessionRows, error: sErr } = await db
    .from("chat_sessions")
    .select("*")
    .eq("device_id", deviceId)
    .order("updated_at", { ascending: true });

  if (sErr) throw sErr;
  if (!sessionRows || sessionRows.length === 0) return [];

  const sessionIds = sessionRows.map((s) => s.id);
  const { data: msgRows, error: mErr } = await db
    .from("chat_messages")
    .select("*")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });

  if (mErr) throw mErr;

  const msgsBySession: Record<string, Message[]> = {};
  for (const row of (msgRows ?? []) as MessageRow[]) {
    if (!msgsBySession[row.session_id]) msgsBySession[row.session_id] = [];
    msgsBySession[row.session_id].push(rowToMessage(row));
  }

  return (sessionRows as SessionRow[]).map((s) =>
    rowToSession(s, msgsBySession[s.id] ?? []),
  );
}

export async function createSession(
  deviceId: string,
  session: Session,
): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.from("chat_sessions").insert({
    id: session.id,
    device_id: deviceId,
    title: session.title,
    created_at: new Date(session.createdAt).toISOString(),
    updated_at: new Date(session.updatedAt).toISOString(),
  });
  if (error) throw error;
}

export async function renameSession(
  id: string,
  title: string,
): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db
    .from("chat_sessions")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function touchSession(id: string): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSession(id: string): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.from("chat_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function clearAllSessions(deviceId: string): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db
    .from("chat_sessions")
    .delete()
    .eq("device_id", deviceId);
  if (error) throw error;
}

// ---- 메시지 CRUD ----

export async function insertMessage(
  deviceId: string,
  sessionId: string,
  message: Message,
): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.from("chat_messages").insert({
    id: message.id,
    session_id: sessionId,
    device_id: deviceId,
    role: message.role,
    content: message.content,
    tool_calls: message.toolCalls ?? null,
    created_at: new Date(message.createdAt).toISOString(),
  });
  if (error) throw error;
}

export async function updateMessage(
  id: string,
  content: string,
  toolCalls?: ToolInvocation[],
): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db
    .from("chat_messages")
    .update({
      content,
      tool_calls: toolCalls ?? null,
    })
    .eq("id", id);
  if (error) throw error;
}
