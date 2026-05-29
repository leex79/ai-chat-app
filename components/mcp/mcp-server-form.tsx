"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { McpServerConfig, McpTransport } from "@/lib/mcp-types";

interface McpServerFormProps {
  open: boolean;
  initial?: McpServerConfig | null;
  onSave: (data: Omit<McpServerConfig, "id" | "status">) => void;
  onClose: () => void;
}

const EMPTY: Omit<McpServerConfig, "id" | "status"> = {
  name: "",
  transport: "stdio",
  command: "",
  args: [],
  env: {},
  url: "",
  headers: {},
};

export function McpServerForm({ open, initial, onSave, onClose }: McpServerFormProps) {
  const [name, setName] = useState("");
  const [transport, setTransport] = useState<McpTransport>("stdio");
  const [command, setCommand] = useState("");
  const [argsRaw, setArgsRaw] = useState("");
  const [envRaw, setEnvRaw] = useState("");
  const [url, setUrl] = useState("");
  const [headersRaw, setHeadersRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const src = initial ?? EMPTY;
      setName(src.name);
      setTransport(src.transport);
      setCommand(src.command ?? "");
      setArgsRaw((src.args ?? []).join(" "));
      setEnvRaw(Object.entries(src.env ?? {}).map(([k, v]) => `${k}=${v}`).join("\n"));
      setUrl(src.url ?? "");
      setHeadersRaw(Object.entries(src.headers ?? {}).map(([k, v]) => `${k}: ${v}`).join("\n"));
      setError(null);
    }
  }, [open, initial]);

  function parseEnv(raw: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const idx = line.indexOf("=");
      if (idx < 1) continue;
      result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return result;
  }

  function parseHeaders(raw: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const idx = line.indexOf(":");
      if (idx < 1) continue;
      result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return result;
  }

  const handleSave = () => {
    setError(null);
    if (!name.trim()) { setError("서버 이름을 입력해 주세요."); return; }
    if (transport === "stdio" && !command.trim()) { setError("command를 입력해 주세요."); return; }
    if (transport === "http" && !url.trim()) { setError("URL을 입력해 주세요."); return; }

    const data: Omit<McpServerConfig, "id" | "status"> = { name: name.trim(), transport };
    if (transport === "stdio") {
      data.command = command.trim();
      data.args = argsRaw.trim() ? argsRaw.trim().split(/\s+/) : [];
      data.env = parseEnv(envRaw);
    } else {
      data.url = url.trim();
      data.headers = parseHeaders(headersRaw);
    }
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "서버 편집" : "MCP 서버 추가"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="mcp-name">서버 이름 *</Label>
            <Input id="mcp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My MCP Server" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="mcp-transport">전송 방식 *</Label>
            <Select value={transport} onValueChange={(v) => setTransport(v as McpTransport)}>
              <SelectTrigger id="mcp-transport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stdio">STDIO (command)</SelectItem>
                <SelectItem value="http">HTTP / SSE (url)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {transport === "stdio" ? (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="mcp-command">Command *</Label>
                <Input id="mcp-command" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npx" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="mcp-args">Arguments <span className="text-muted-foreground text-xs">(공백 구분)</span></Label>
                <Input id="mcp-args" value={argsRaw} onChange={(e) => setArgsRaw(e.target.value)} placeholder="-y @modelcontextprotocol/server-filesystem /tmp" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="mcp-env">Environment Variables <span className="text-muted-foreground text-xs">(KEY=VALUE, 줄바꿈 구분)</span></Label>
                <textarea
                  id="mcp-env"
                  value={envRaw}
                  onChange={(e) => setEnvRaw(e.target.value)}
                  rows={3}
                  placeholder={"API_KEY=abc123\nDEBUG=true"}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="mcp-url">URL *</Label>
                <Input id="mcp-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://localhost:3100/sse" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="mcp-headers">Headers <span className="text-muted-foreground text-xs">(Key: Value, 줄바꿈 구분)</span></Label>
                <textarea
                  id="mcp-headers"
                  value={headersRaw}
                  onChange={(e) => setHeadersRaw(e.target.value)}
                  rows={3}
                  placeholder={"Authorization: Bearer token\nX-Custom: value"}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSave}>{initial ? "저장" : "추가"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
