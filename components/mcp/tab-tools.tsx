"use client";

import { useState } from "react";
import { AlertCircle, Play, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { McpTool } from "@/lib/mcp-types";

interface ToolResult {
  content: { type: string; text?: string }[];
  isError?: boolean;
}

interface TabToolsProps {
  serverId: string;
  tools: McpTool[];
  onCallTool: (name: string, args: Record<string, string>) => Promise<ToolResult>;
}

export function TabTools({ tools, onCallTool }: TabToolsProps) {
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ToolResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectTool = (tool: McpTool) => {
    setSelectedTool(tool);
    setInputs({});
    setResult(null);
    setError(null);
  };

  const handleRun = async () => {
    if (!selectedTool) return;
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await onCallTool(selectedTool.name, inputs);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <Wrench className="h-8 w-8 opacity-30" aria-hidden="true" />
        <p className="text-sm">이 서버에 등록된 Tool이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* 목록 */}
      <div className="w-52 shrink-0 flex flex-col gap-1">
        {tools.map((t) => (
          <button
            key={t.name}
            onClick={() => selectTool(t)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              selectedTool?.name === t.name
                ? "border-primary/40 bg-accent font-medium"
                : "border-transparent hover:bg-accent/50"
            }`}
          >
            <span className="block truncate font-mono text-xs">{t.name}</span>
            {t.description && (
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{t.description}</span>
            )}
          </button>
        ))}
      </div>

      {/* 상세 + 실행 */}
      <div className="flex flex-1 flex-col gap-4">
        {selectedTool ? (
          <>
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className="font-mono">{selectedTool.name}</span>
                  <Badge variant="outline" className="text-[10px]">Tool</Badge>
                </CardTitle>
                {selectedTool.description && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedTool.description}</p>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {Object.entries(selectedTool.inputSchema?.properties ?? {}).map(([key, prop]) => {
                  const required = selectedTool.inputSchema?.required?.includes(key);
                  return (
                    <div key={key} className="grid gap-1">
                      <Label className="flex items-center gap-1 text-xs">
                        <span className="font-mono">{key}</span>
                        {required && <span className="text-destructive">*</span>}
                        {prop.type && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0">{prop.type}</Badge>
                        )}
                      </Label>
                      {prop.description && (
                        <p className="text-[11px] text-muted-foreground">{prop.description}</p>
                      )}
                      <Input
                        value={inputs[key] ?? ""}
                        onChange={(e) => setInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={prop.description ?? key}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  );
                })}
                <Button size="sm" className="mt-1 w-fit gap-1.5" onClick={handleRun} disabled={running}>
                  <Play className="h-3.5 w-3.5" aria-hidden="true" />
                  {running ? "실행 중…" : "실행"}
                </Button>
              </CardContent>
            </Card>

            {error && (
              <Card className="border-destructive/40">
                <CardContent className="flex items-start gap-2 pt-4">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
                  <p className="text-xs text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {result && (
              <Card className={result.isError ? "border-destructive/40" : ""}>
                <CardHeader className="pb-1 pt-3">
                  <CardTitle className="text-xs text-muted-foreground">실행 결과</CardTitle>
                </CardHeader>
                <CardContent>
                  {result.content.map((c, i) => (
                    <pre
                      key={i}
                      className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs leading-relaxed"
                    >
                      {c.text ?? JSON.stringify(c)}
                    </pre>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            좌측에서 Tool을 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
}
