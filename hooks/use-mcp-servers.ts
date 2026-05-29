"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toMcpJson, fromMcpJson } from "@/lib/mcp-storage";
import {
  listServers,
  insertServer,
  updateServer as dbUpdateServer,
  deleteServer as dbDeleteServer,
} from "@/lib/db/mcp";
import { getDeviceId } from "@/lib/device-id";
import type { McpCapabilities, McpServerConfig } from "@/lib/mcp-types";
import { buildToolArgs } from "@/lib/mcp-types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data as T;
}

export function useMcpServers() {
  const [servers, setServers] = useState<McpServerConfig[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<Record<string, McpCapabilities>>({});
  const [didLoad, setDidLoad] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const deviceId = getDeviceId();

    listServers(deviceId)
      .then((rows) => {
        const configs = rows.map(({ enabled: _enabled, ...c }) => c);
        setServers(configs);
        setDidLoad(true);

        // 서버 사이드 싱글톤과 재동기화
        return fetch("/api/mcp/status")
          .then((res) => res.json())
          .then((data: { sessions?: { id: string; capabilities: McpCapabilities }[] }) => {
            const sessionMap = new Map(
              (data.sessions ?? []).map((s) => [s.id, s.capabilities]),
            );
            const restoredCaps: Record<string, McpCapabilities> = {};
            setServers((prev) =>
              prev.map((s) => {
                if (sessionMap.has(s.id)) {
                  restoredCaps[s.id] = sessionMap.get(s.id)!;
                  return { ...s, status: "connected" as const, errorMessage: undefined };
                }
                return s;
              }),
            );
            setCapabilities(restoredCaps);
          });
      })
      .catch(() => {
        setDidLoad(true);
      });
  }, []);

  const activeServer = servers.find((s) => s.id === activeId) ?? null;

  const addServer = useCallback((config: Omit<McpServerConfig, "id" | "status">) => {
    const newServer: McpServerConfig = { ...config, id: generateId(), status: "disconnected" };
    const deviceId = getDeviceId();
    insertServer(deviceId, newServer).catch(() => {});
    setServers((prev) => [...prev, newServer]);
    setActiveId(newServer.id);
    return newServer;
  }, []);

  const updateServer = useCallback((id: string, patch: Partial<Omit<McpServerConfig, "id">>) => {
    // DB에는 status/errorMessage 등 런타임 필드는 저장하지 않음
    const { status: _s, errorMessage: _e, ...dbPatch } = patch as Partial<McpServerConfig>;
    if (Object.keys(dbPatch).length > 0) {
      dbUpdateServer(id, dbPatch).catch(() => {});
    }
    setServers((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeServer = useCallback(async (id: string) => {
    await fetch("/api/mcp/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    dbDeleteServer(id).catch(() => {});
    setCapabilities((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setServers((prev) => prev.filter((s) => s.id !== id));
    setActiveId((prev) => (prev === id ? null : prev));
  }, []);

  const selectServer = useCallback((id: string | null) => {
    setActiveId(id);
  }, []);

  const connect = useCallback(async (id: string) => {
    const server = servers.find((s) => s.id === id);
    if (!server) return;

    setServers((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: "connecting", errorMessage: undefined } : s)
    );

    try {
      const { capabilities: caps } = await apiPost<{ capabilities: McpCapabilities }>(
        "/api/mcp/connect",
        { server },
      );
      setCapabilities((prev) => ({ ...prev, [id]: caps }));
      setServers((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: "connected", errorMessage: undefined } : s)
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setServers((prev) =>
        prev.map((s) => s.id === id ? { ...s, status: "error", errorMessage: message } : s)
      );
    }
  }, [servers]);

  const disconnect = useCallback(async (id: string) => {
    try {
      await apiPost("/api/mcp/disconnect", { id });
    } catch {
      // 이미 끊겼을 수 있으므로 무시
    }
    setCapabilities((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setServers((prev) =>
      prev.map((s) => s.id === id ? { ...s, status: "disconnected", errorMessage: undefined } : s)
    );
  }, []);

  const callTool = useCallback(async (
    id: string,
    name: string,
    formArgs: Record<string, string>,
  ): Promise<{ content: { type: string; text?: string }[]; isError?: boolean }> => {
    const args = buildToolArgs(formArgs);
    return apiPost("/api/mcp/call-tool", { id, name, arguments: args });
  }, []);

  const getPrompt = useCallback(async (
    id: string,
    name: string,
    args: Record<string, string>,
  ): Promise<{ messages: { role: string; content: { type: string; text?: string } }[] }> => {
    return apiPost("/api/mcp/get-prompt", { id, name, arguments: args });
  }, []);

  const readResource = useCallback(async (
    id: string,
    uri: string,
  ): Promise<{ contents: { uri: string; text?: string; mimeType?: string }[] }> => {
    return apiPost("/api/mcp/read-resource", { id, uri });
  }, []);

  const importServers = useCallback((json: unknown, replace: boolean) => {
    const imported = fromMcpJson(json);
    const deviceId = getDeviceId();
    if (replace) {
      setServers((prev) => {
        prev.forEach((s) => dbDeleteServer(s.id).catch(() => {}));
        return [];
      });
      setCapabilities({});
      setActiveId(null);
    }
    imported.forEach((s) => insertServer(deviceId, s).catch(() => {}));
    if (replace) {
      setServers(imported);
    } else {
      setServers((prev) => [...prev, ...imported]);
    }
    return imported.length;
  }, []);

  const exportServers = useCallback(() => {
    return toMcpJson(servers);
  }, [servers]);

  return {
    servers,
    activeId,
    activeServer,
    capabilities,
    didLoad,
    addServer,
    updateServer,
    removeServer,
    selectServer,
    connect,
    disconnect,
    callTool,
    getPrompt,
    readResource,
    importServers,
    exportServers,
  };
}
