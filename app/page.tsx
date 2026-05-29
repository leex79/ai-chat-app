"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { McpToolButton, McpToolToggleDialog } from "@/components/chat/mcp-tool-toggle";
import { MessageList } from "@/components/chat/message-list";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/use-chat";
import { useMcpChatTools } from "@/hooks/use-mcp-chat-tools";
import { migrateLocalStorageToDb } from "@/lib/migrate-local-to-db";

export default function ChatPage() {
  const {
    sessions,
    activeId,
    messages,
    isResponding,
    newSession,
    selectSession,
    renameSession,
    deleteSession,
    clearAll,
    sendMessage,
    cleanup,
  } = useChat();

  const {
    connectedServers,
    enabledIds,
    enabledServerIds,
    activeToolCount,
    toggleServer,
  } = useMcpChatTools();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toolDialogOpen, setToolDialogOpen] = useState(false);

  useEffect(() => {
    migrateLocalStorageToDb().catch(() => {});
    return cleanup;
  }, [cleanup]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* 사이드바 — 모바일에서 토글 */}
      {sidebarOpen && (
        <ChatSidebar
          sessions={sessions}
          activeId={activeId}
          onNew={newSession}
          onSelect={(id) => { selectSession(id); setSidebarOpen(true); }}
          onRename={renameSession}
          onDelete={deleteSession}
          onClearAll={clearAll}
        />
      )}

      {/* 채팅 영역 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-border bg-background">
          <Button
            variant="ghost"
            size="icon"
            className="ml-1 shrink-0"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
          >
            {sidebarOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
          <div className="flex-1">
            <ChatHeader />
          </div>
        </div>
        <MessageList messages={messages} />
        <ChatInput
          onSend={(text) => sendMessage(text, enabledServerIds)}
          isDisabled={isResponding}
          toolSlot={
            <McpToolButton
              activeToolCount={activeToolCount}
              onClick={() => setToolDialogOpen(true)}
              disabled={isResponding}
            />
          }
        />
      </div>

      <McpToolToggleDialog
        open={toolDialogOpen}
        onClose={() => setToolDialogOpen(false)}
        servers={connectedServers}
        enabledIds={enabledIds}
        onToggle={toggleServer}
      />
    </div>
  );
}
