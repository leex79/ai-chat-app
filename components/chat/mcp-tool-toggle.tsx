"use client";

import Link from "next/link";
import { Check, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { McpServerToolInfo } from "@/hooks/use-mcp-chat-tools";

interface McpToolToggleProps {
  open: boolean;
  onClose: () => void;
  servers: McpServerToolInfo[];
  enabledIds: string[];
  onToggle: (id: string) => void;
}

export function McpToolToggleDialog({
  open,
  onClose,
  servers,
  enabledIds,
  onToggle,
}: McpToolToggleProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Wrench className="h-4 w-4" aria-hidden="true" />
            MCP 도구 활성화
          </DialogTitle>
        </DialogHeader>

        {servers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center text-muted-foreground">
            <Wrench className="h-8 w-8 opacity-30" aria-hidden="true" />
            <p className="text-sm">연결된 MCP 서버가 없습니다.</p>
            <Link href="/mcp" onClick={onClose}>
              <Button variant="outline" size="sm" className="text-xs">
                MCP Inspector 이동
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {servers.map((s) => {
              const enabled = enabledIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => onToggle(s.id)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    enabled
                      ? "border-primary/40 bg-accent"
                      : "border-transparent hover:bg-accent/50",
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.toolCount}개 도구
                    </span>
                  </div>
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border",
                      enabled
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30",
                    )}
                  >
                    {enabled && <Check className="h-3 w-3" aria-hidden="true" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface McpToolButtonProps {
  activeToolCount: number;
  onClick: () => void;
  disabled?: boolean;
}

export function McpToolButton({ activeToolCount, onClick, disabled }: McpToolButtonProps) {
  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClick}
        disabled={disabled}
        aria-label="MCP 도구 설정"
        className="shrink-0 text-muted-foreground"
      >
        <Wrench className="h-4 w-4" aria-hidden="true" />
      </Button>
      {activeToolCount > 0 && (
        <Badge
          variant="default"
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center px-1 text-[9px] leading-none"
        >
          {activeToolCount}
        </Badge>
      )}
    </div>
  );
}
