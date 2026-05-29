"use client";

import { useRef, useState } from "react";
import { Clipboard, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fromMcpJson, toMcpJson } from "@/lib/mcp-storage";
import type { McpServerConfig } from "@/lib/mcp-types";

interface ImportExportDialogProps {
  open: boolean;
  onClose: () => void;
  servers: McpServerConfig[];
  onImport: (json: unknown, replace: boolean) => number;
}

export function ImportExportDialog({ open, onClose, servers, onImport }: ImportExportDialogProps) {
  const [tab, setTab] = useState<"import" | "export">("import");
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = JSON.stringify(toMcpJson(servers), null, 2);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJsonText((ev.target?.result as string) ?? "");
      setParseError(null);
      setImportMsg(null);
    };
    reader.readAsText(file);
  };

  const handleImport = (replace: boolean) => {
    setParseError(null);
    setImportMsg(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setParseError("JSON 파싱 오류: 올바른 JSON 형식인지 확인해 주세요.");
      return;
    }
    try {
      const count = onImport(parsed, replace);
      setImportMsg(`${count}개 서버를 ${replace ? "교체" : "추가"} 가져왔습니다.`);
      setJsonText("");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mcp.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>서버 불러오기 / 내보내기</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "import" | "export")}>
          <TabsList className="w-full">
            <TabsTrigger value="import" className="flex-1 gap-1.5">
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              불러오기
            </TabsTrigger>
            <TabsTrigger value="export" className="flex-1 gap-1.5">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              내보내기
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="flex flex-col gap-3 pt-3">
            <p className="text-sm text-muted-foreground">
              표준 <code className="font-mono text-xs">mcp.json</code> 파일을 선택하거나 JSON을 직접 붙여넣으세요.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                파일 선택
              </Button>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileChange} />
              {jsonText && <span className="text-xs text-muted-foreground">파일 로드됨 ({jsonText.length} chars)</span>}
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); setParseError(null); setImportMsg(null); }}
              rows={8}
              placeholder={'{\n  "mcpServers": {\n    "my-server": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-filesystem"]\n    }\n  }\n}'}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
            {importMsg && <p className="text-sm text-green-600 dark:text-green-400">{importMsg}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleImport(false)} disabled={!jsonText.trim()}>추가로 가져오기</Button>
              <Button size="sm" variant="outline" onClick={() => handleImport(true)} disabled={!jsonText.trim()}>교체하여 가져오기</Button>
            </div>
          </TabsContent>

          <TabsContent value="export" className="flex flex-col gap-3 pt-3">
            <p className="text-sm text-muted-foreground">
              현재 등록된 서버 {servers.length}개를 표준 <code className="font-mono text-xs">mcp.json</code> 형식으로 내보냅니다.
            </p>
            <pre className="max-h-64 overflow-auto rounded-md border bg-muted p-3 font-mono text-xs leading-relaxed">
              {exportJson}
            </pre>
            <div className="flex gap-2">
              <Button size="sm" className="gap-1.5" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                mcp.json 다운로드
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handleCopy}>
                <Clipboard className="h-3.5 w-3.5" aria-hidden="true" />
                {copied ? "복사됨!" : "클립보드 복사"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
