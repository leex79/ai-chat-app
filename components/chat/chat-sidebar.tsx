import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SessionItem } from "./session-item";
import type { Session } from "@/lib/types";

interface ChatSidebarProps {
  sessions: Session[];
  activeId: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function ChatSidebar({
  sessions,
  activeId,
  onNew,
  onSelect,
  onRename,
  onDelete,
  onClearAll,
}: ChatSidebarProps) {
  const handleClearAll = () => {
    if (window.confirm("모든 대화를 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) {
      onClearAll();
    }
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="p-3">
        <Button
          onClick={onNew}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          새 대화
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="flex flex-col gap-0.5 py-1">
          {sessions
            .slice()
            .reverse()
            .map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeId}
                onSelect={() => onSelect(session.id)}
                onRename={(title) => onRename(session.id, title)}
                onDelete={() => onDelete(session.id)}
              />
            ))}
        </div>
      </ScrollArea>

      {sessions.length > 0 && (
        <div className="border-t border-border p-3">
          <Button
            onClick={handleClearAll}
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            전체 삭제
          </Button>
        </div>
      )}
    </aside>
  );
}
