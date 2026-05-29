"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, PlugZap, Trash2, Unplug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { McpServerConfig, McpStatus } from "@/lib/mcp-types";
import { McpServerForm } from "./mcp-server-form";

interface McpServerListProps {
  servers: McpServerConfig[];
  activeId: string | null;
  didLoad: boolean;
  onSelect: (id: string) => void;
  onAdd: (data: Omit<McpServerConfig, "id" | "status">) => void;
  onUpdate: (id: string, data: Omit<McpServerConfig, "id" | "status">) => void;
  onRemove: (id: string) => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}

function StatusBadge({ status }: { status: McpStatus }) {
  const map: Record<McpStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    connected: { label: "연결됨", variant: "default" },
    connecting: { label: "연결 중…", variant: "secondary" },
    disconnected: { label: "미연결", variant: "outline" },
    error: { label: "오류", variant: "destructive" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant} className="text-[10px] px-1.5 py-0">{label}</Badge>;
}

export function McpServerList({
  servers,
  activeId,
  didLoad,
  onSelect,
  onAdd,
  onUpdate,
  onRemove,
  onConnect,
  onDisconnect,
}: McpServerListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<McpServerConfig | null>(null);

  const openAdd = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (s: McpServerConfig) => { setEditTarget(s); setFormOpen(true); };

  const handleSave = (data: Omit<McpServerConfig, "id" | "status">) => {
    if (editTarget) onUpdate(editTarget.id, data);
    else onAdd(data);
    setFormOpen(false);
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-muted/20">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm font-semibold">MCP 서버</span>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={openAdd}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          추가
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {!didLoad ? (
          <div className="flex flex-col gap-2 p-2">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border border-transparent px-3 py-2.5">
                <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center text-muted-foreground">
            <PlugZap className="h-8 w-8 opacity-30" aria-hidden="true" />
            <p className="text-sm">등록된 서버가 없습니다.</p>
            <p className="text-xs">상단 추가 버튼으로 MCP 서버를 등록하세요.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {servers.map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(s.id)}
                onKeyDown={(e) => { if (e.key === "Enter") onSelect(s.id); }}
                className={cn(
                  "group flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                  activeId === s.id
                    ? "border-primary/40 bg-accent"
                    : "border-transparent hover:border-border hover:bg-accent/50",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{s.name}</span>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      aria-label="편집"
                      onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 hover:text-destructive"
                      aria-label="삭제"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`"${s.name}" 서버를 삭제할까요?`)) onRemove(s.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">{s.transport}</Badge>
                    <StatusBadge status={s.status} />
                  </div>
                  {s.status === "connecting" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
                  ) : s.status === "connected" ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground"
                      aria-label="연결 해제"
                      onClick={(e) => { e.stopPropagation(); onDisconnect(s.id); }}
                    >
                      <Unplug className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-muted-foreground"
                      aria-label="연결"
                      onClick={(e) => { e.stopPropagation(); onConnect(s.id); }}
                    >
                      <PlugZap className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </div>

                {s.transport === "stdio" && s.command && (
                  <p className="truncate font-mono text-[10px] text-muted-foreground">{s.command} {s.args?.join(" ")}</p>
                )}
                {s.transport === "http" && s.url && (
                  <p className="truncate font-mono text-[10px] text-muted-foreground">{s.url}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <McpServerForm
        open={formOpen}
        initial={editTarget}
        onSave={handleSave}
        onClose={() => setFormOpen(false)}
      />
    </aside>
  );
}
