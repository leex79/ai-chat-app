"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FolderDown, FolderUp } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImportExportDialog } from "@/components/mcp/import-export-dialog";
import { McpInspectorPanel } from "@/components/mcp/mcp-inspector-panel";
import { McpServerList } from "@/components/mcp/mcp-server-list";
import { useMcpServers } from "@/hooks/use-mcp-servers";

export default function McpPage() {
  const {
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
  } = useMcpServers();

  const [ioOpen, setIoOpen] = useState(false);

  const activeCaps = activeServer ? (capabilities[activeServer.id] ?? null) : null;

  const handleCallTool = (name: string, args: Record<string, string>) => {
    if (!activeServer) throw new Error("선택된 서버가 없습니다.");
    return callTool(activeServer.id, name, args);
  };

  const handleGetPrompt = (name: string, args: Record<string, string>) => {
    if (!activeServer) throw new Error("선택된 서버가 없습니다.");
    return getPrompt(activeServer.id, name, args);
  };

  const handleReadResource = (uri: string) => {
    if (!activeServer) throw new Error("선택된 서버가 없습니다.");
    return readResource(activeServer.id, uri);
  };

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="채팅으로 돌아가기"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold">MCP Inspector</h1>
            <p className="text-xs text-muted-foreground">MCP 서버 관리 및 테스트</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => setIoOpen(true)}
          >
            <FolderDown className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline text-xs">불러오기</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => { exportServers(); setIoOpen(true); }}
          >
            <FolderUp className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline text-xs">내보내기</span>
          </Button>
        </div>
      </header>

      {/* 본문 */}
      <div className="flex flex-1 overflow-hidden">
        <McpServerList
          servers={servers}
          activeId={activeId}
          didLoad={didLoad}
          onSelect={selectServer}
          onAdd={addServer}
          onUpdate={(id, data) => updateServer(id, data)}
          onRemove={removeServer}
          onConnect={connect}
          onDisconnect={disconnect}
        />
        <McpInspectorPanel
          server={activeServer}
          capabilities={activeCaps}
          onCallTool={handleCallTool}
          onGetPrompt={handleGetPrompt}
          onReadResource={handleReadResource}
        />
      </div>

      <ImportExportDialog
        open={ioOpen}
        onClose={() => setIoOpen(false)}
        servers={servers}
        onImport={(json, replace) => importServers(json, replace)}
      />
    </div>
  );
}
