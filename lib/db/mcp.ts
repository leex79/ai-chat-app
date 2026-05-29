import { getSupabaseClient } from "@/lib/supabase/client";
import type { McpServerConfig, McpTransport } from "@/lib/mcp-types";

// ---- 행 타입 ----

interface McpServerRow {
  id: string;
  device_id: string;
  name: string;
  transport: McpTransport;
  command: string | null;
  args: string[] | null;
  env: Record<string, string> | null;
  url: string | null;
  headers: Record<string, string> | null;
  enabled: boolean;
  created_at: string;
}

// ---- 매핑 ----

function rowToConfig(row: McpServerRow): McpServerConfig & { enabled: boolean } {
  return {
    id: row.id,
    name: row.name,
    transport: row.transport,
    command: row.command ?? undefined,
    args: row.args ?? undefined,
    env: row.env ?? undefined,
    url: row.url ?? undefined,
    headers: row.headers ?? undefined,
    status: "disconnected",
    enabled: row.enabled,
  };
}

// ---- 서버 CRUD ----

export async function listServers(
  deviceId: string,
): Promise<(McpServerConfig & { enabled: boolean })[]> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from("mcp_servers")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToConfig(r as McpServerRow));
}

export async function insertServer(
  deviceId: string,
  config: McpServerConfig,
  enabled = true,
): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.from("mcp_servers").insert({
    id: config.id,
    device_id: deviceId,
    name: config.name,
    transport: config.transport,
    command: config.command ?? null,
    args: config.args ?? null,
    env: config.env ?? null,
    url: config.url ?? null,
    headers: config.headers ?? null,
    enabled,
  });
  if (error) throw error;
}

export async function updateServer(
  id: string,
  patch: Partial<Omit<McpServerConfig, "id" | "status">>,
): Promise<void> {
  const db = getSupabaseClient();
  const update: Partial<McpServerRow> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.transport !== undefined) update.transport = patch.transport;
  if (patch.command !== undefined) update.command = patch.command ?? null;
  if (patch.args !== undefined) update.args = patch.args ?? null;
  if (patch.env !== undefined) update.env = patch.env ?? null;
  if (patch.url !== undefined) update.url = patch.url ?? null;
  if (patch.headers !== undefined) update.headers = patch.headers ?? null;
  const { error } = await db.from("mcp_servers").update(update).eq("id", id);
  if (error) throw error;
}

export async function deleteServer(id: string): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db.from("mcp_servers").delete().eq("id", id);
  if (error) throw error;
}

export async function setEnabled(id: string, enabled: boolean): Promise<void> {
  const db = getSupabaseClient();
  const { error } = await db
    .from("mcp_servers")
    .update({ enabled })
    .eq("id", id);
  if (error) throw error;
}
