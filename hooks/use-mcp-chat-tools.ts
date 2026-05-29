"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listServers, setEnabled } from "@/lib/db/mcp";
import { getDeviceId } from "@/lib/device-id";
import type { McpCapabilities } from "@/lib/mcp-types";

export interface McpServerToolInfo {
  id: string;
  name: string;
  toolCount: number;
}

export function useMcpChatTools() {
  const [connectedServers, setConnectedServers] = useState<McpServerToolInfo[]>([]);
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [didLoad, setDidLoad] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const deviceId = getDeviceId();

    // DB에서 서버 목록과 enabled 값을 로드
    listServers(deviceId)
      .then((rows) => {
        const nameMap = new Map(rows.map((r) => [r.id, r.name]));
        const enabledFromDb = rows.filter((r) => r.enabled).map((r) => r.id);

        // 서버 사이드 연결 상태와 capabilities를 가져옴
        return fetch("/api/mcp/status")
          .then((res) => res.json())
          .then((data: { sessions?: { id: string; capabilities: McpCapabilities }[] }) => {
            const sessions = data.sessions ?? [];
            const infos: McpServerToolInfo[] = sessions.map((s) => ({
              id: s.id,
              name: nameMap.get(s.id) ?? s.id,
              toolCount: s.capabilities?.tools?.length ?? 0,
            }));
            setConnectedServers(infos);

            const connectedIds = new Set(infos.map((s) => s.id));
            const initial = enabledFromDb.filter((id) => connectedIds.has(id));
            setEnabledIds(initial);
            setDidLoad(true);
          });
      })
      .catch(() => {
        setConnectedServers([]);
        setEnabledIds([]);
        setDidLoad(true);
      });
  }, []);

  const toggleServer = useCallback((id: string) => {
    setEnabledIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // DB에 enabled 상태 저장
      setEnabled(id, next.includes(id)).catch(() => {});
      return next;
    });
  }, []);

  // 실제로 연결된 서버 중 활성화된 것만 전달
  const enabledServerIds = enabledIds.filter((id) =>
    connectedServers.some((s) => s.id === id),
  );

  const activeToolCount = connectedServers
    .filter((s) => enabledServerIds.includes(s.id))
    .reduce((sum, s) => sum + s.toolCount, 0);

  return {
    connectedServers,
    enabledIds,
    enabledServerIds,
    activeToolCount,
    didLoad,
    toggleServer,
  };
}
