"use client";

/**
 * localStorage 데이터를 Supabase DB로 1회 이관 (best-effort).
 * 이관 완료 후 "ai-chat:migrated:v1" 플래그를 설정하여 중복 실행을 방지한다.
 */

import { getDeviceId } from "@/lib/device-id";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Session } from "@/lib/types";
import type { McpServerConfig } from "@/lib/mcp-types";

const MIGRATED_KEY = "ai-chat:migrated:v1";
const SESSIONS_KEY = "ai-chat:sessions:v1";
const MCP_KEY = "ai-chat:mcp-servers:v1";

export async function migrateLocalStorageToDb(): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATED_KEY) === "1") return;

  const deviceId = getDeviceId();
  const db = getSupabaseClient();

  try {
    // DB가 이미 비어있는지 확인
    const [{ data: existingSessions }, { data: existingServers }] = await Promise.all([
      db.from("chat_sessions").select("id").eq("device_id", deviceId).limit(1),
      db.from("mcp_servers").select("id").eq("device_id", deviceId).limit(1),
    ]);

    const dbHasData =
      (existingSessions && existingSessions.length > 0) ||
      (existingServers && existingServers.length > 0);

    if (dbHasData) {
      localStorage.setItem(MIGRATED_KEY, "1");
      return;
    }

    // 채팅 세션 이관
    const rawSessions = localStorage.getItem(SESSIONS_KEY);
    if (rawSessions) {
      const sessions: Session[] = JSON.parse(rawSessions);
      for (const session of sessions) {
        await db.from("chat_sessions").insert({
          id: session.id,
          device_id: deviceId,
          title: session.title,
          created_at: new Date(session.createdAt).toISOString(),
          updated_at: new Date(session.updatedAt).toISOString(),
        });

        for (const msg of session.messages) {
          await db.from("chat_messages").insert({
            id: msg.id,
            session_id: session.id,
            device_id: deviceId,
            role: msg.role,
            content: msg.content,
            tool_calls: msg.toolCalls ?? null,
            created_at: new Date(msg.createdAt).toISOString(),
          });
        }
      }
    }

    // MCP 서버 이관
    const rawMcp = localStorage.getItem(MCP_KEY);
    if (rawMcp) {
      const servers: McpServerConfig[] = JSON.parse(rawMcp);
      for (const s of servers) {
        await db.from("mcp_servers").insert({
          id: s.id,
          device_id: deviceId,
          name: s.name,
          transport: s.transport,
          command: s.command ?? null,
          args: s.args ?? null,
          env: s.env ?? null,
          url: s.url ?? null,
          headers: s.headers ?? null,
          enabled: true,
        });
      }
    }

    localStorage.setItem(MIGRATED_KEY, "1");
  } catch {
    // 이관 실패 시 앱 동작에 영향 없도록 무시
  }
}
