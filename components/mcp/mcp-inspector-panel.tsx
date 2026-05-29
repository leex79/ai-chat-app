import { PlugZap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { McpCapabilities, McpServerConfig } from "@/lib/mcp-types";
import { TabPrompts } from "./tab-prompts";
import { TabResources } from "./tab-resources";
import { TabTools } from "./tab-tools";

interface McpInspectorPanelProps {
  server: McpServerConfig | null;
  capabilities: McpCapabilities | null;
  onCallTool: (name: string, args: Record<string, string>) => Promise<{
    content: { type: string; text?: string }[];
    isError?: boolean;
  }>;
  onGetPrompt: (name: string, args: Record<string, string>) => Promise<{
    messages: { role: string; content: { type: string; text?: string } }[];
  }>;
  onReadResource: (uri: string) => Promise<{
    contents: { uri: string; text?: string; mimeType?: string }[];
  }>;
}

export function McpInspectorPanel({
  server,
  capabilities,
  onCallTool,
  onGetPrompt,
  onReadResource,
}: McpInspectorPanelProps) {
  if (!server) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <PlugZap className="h-12 w-12 opacity-20" aria-hidden="true" />
        <p className="text-sm">좌측에서 MCP 서버를 선택하세요.</p>
      </div>
    );
  }

  if (server.status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <PlugZap className="h-12 w-12 opacity-20 text-destructive" aria-hidden="true" />
        <p className="text-sm font-medium text-destructive">{server.name}</p>
        <p className="max-w-sm text-center text-xs text-destructive/80">
          {server.errorMessage ?? "연결에 실패했습니다. 설정을 확인하고 다시 연결해 주세요."}
        </p>
      </div>
    );
  }

  if (server.status !== "connected") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <PlugZap className="h-12 w-12 opacity-20" aria-hidden="true" />
        <p className="text-sm font-medium">{server.name}</p>
        <p className="text-xs">
          {server.status === "connecting"
            ? "서버에 연결 중입니다…"
            : "서버에 연결해야 조회할 수 있습니다."}
        </p>
      </div>
    );
  }

  const tools = capabilities?.tools ?? [];
  const prompts = capabilities?.prompts ?? [];
  const resources = capabilities?.resources ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">{server.name}</h2>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {server.transport === "stdio"
            ? `${server.command} ${server.args?.join(" ") ?? ""}`
            : server.url}
        </p>
      </div>

      <Tabs defaultValue="tools" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="mx-6 mt-4 w-fit">
          <TabsTrigger value="tools">
            Tools{" "}
            <span className="ml-1 text-muted-foreground text-xs">({tools.length})</span>
          </TabsTrigger>
          <TabsTrigger value="prompts">
            Prompts{" "}
            <span className="ml-1 text-muted-foreground text-xs">({prompts.length})</span>
          </TabsTrigger>
          <TabsTrigger value="resources">
            Resources{" "}
            <span className="ml-1 text-muted-foreground text-xs">({resources.length})</span>
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 px-6 py-4">
          <TabsContent value="tools" className="mt-0">
            <TabTools
              serverId={server.id}
              tools={tools}
              onCallTool={onCallTool}
            />
          </TabsContent>
          <TabsContent value="prompts" className="mt-0">
            <TabPrompts
              serverId={server.id}
              prompts={prompts}
              onGetPrompt={onGetPrompt}
            />
          </TabsContent>
          <TabsContent value="resources" className="mt-0">
            <TabResources
              resources={resources}
              onReadResource={onReadResource}
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
