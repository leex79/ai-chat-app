"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Loader2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolInvocation } from "@/lib/types";

interface ToolCallCardProps {
  invocation: ToolInvocation;
}

export function ToolCallCard({ invocation }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isDone = invocation.status === "done";
  const isCalling = invocation.status === "calling";

  const hasArgs = invocation.args && Object.keys(invocation.args).length > 0;
  const hasResult = invocation.result !== undefined;

  return (
    <div className="mb-2 rounded-lg border border-border bg-background/60 text-xs">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        aria-expanded={expanded}
      >
        {isCalling ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
        )}
        <Wrench className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="font-mono font-medium">{invocation.name}</span>
        {isDone && (
          <span className="ml-auto text-[10px] text-muted-foreground">완료</span>
        )}
        {isCalling && (
          <span className="ml-auto text-[10px] text-muted-foreground">실행 중…</span>
        )}
        <span className="ml-1 shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          )}
        </span>
      </button>

      {/* 상세 패널 */}
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2">
          {hasArgs && (
            <div className="mb-2">
              <p className="mb-1 font-semibold text-muted-foreground">인자</p>
              <pre className={cn(
                "overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 font-mono leading-relaxed",
                "text-[11px]",
              )}>
                {JSON.stringify(invocation.args, null, 2)}
              </pre>
            </div>
          )}
          {hasResult && (
            <div>
              <p className="mb-1 font-semibold text-muted-foreground">결과</p>
              <pre className={cn(
                "overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 font-mono leading-relaxed",
                "text-[11px]",
              )}>
                {typeof invocation.result === "string"
                  ? invocation.result
                  : JSON.stringify(invocation.result, null, 2)}
              </pre>
            </div>
          )}
          {!hasArgs && !hasResult && (
            <p className="text-muted-foreground">인자/결과 없음</p>
          )}
        </div>
      )}
    </div>
  );
}
