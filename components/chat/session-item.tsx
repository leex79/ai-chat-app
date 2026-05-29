"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Session } from "@/lib/types";

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function SessionItem({
  session,
  isActive,
  onSelect,
  onRename,
  onDelete,
}: SessionItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(session.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(session.title);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [editing, session.title]);

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== session.title) onRename(trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") setEditing(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`"${session.title}" 대화를 삭제할까요?`)) onDelete();
  };

  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(true);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (!editing) onSelect(); }}
      onKeyDown={(e) => { if (e.key === "Enter" && !editing) onSelect(); }}
      className={cn(
        "group relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitRename}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          aria-label="대화 제목 편집"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate">{session.title}</span>
      )}

      {!editing && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={handleEditStart}
            className="rounded p-0.5 hover:bg-background/60"
            aria-label="이름 변경"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
          </button>
          <button
            onClick={handleDelete}
            className="rounded p-0.5 hover:bg-background/60 hover:text-destructive"
            aria-label="삭제"
          >
            <Trash2 className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
