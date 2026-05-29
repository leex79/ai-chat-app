"use client";

import { useState } from "react";
import { AlertCircle, Download, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { McpPrompt } from "@/lib/mcp-types";

interface PromptResult {
  messages: { role: string; content: { type: string; text?: string } }[];
}

interface TabPromptsProps {
  serverId: string;
  prompts: McpPrompt[];
  onGetPrompt: (name: string, args: Record<string, string>) => Promise<PromptResult>;
}

export function TabPrompts({ prompts, onGetPrompt }: TabPromptsProps) {
  const [selected, setSelected] = useState<McpPrompt | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PromptResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const select = (p: McpPrompt) => {
    setSelected(p);
    setArgs({});
    setResult(null);
    setError(null);
  };

  const handleGet = async () => {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await onGetPrompt(selected.name, args);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <MessageSquareText className="h-8 w-8 opacity-30" aria-hidden="true" />
        <p className="text-sm">이 서버에 등록된 Prompt가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="w-52 shrink-0 flex flex-col gap-1">
        {prompts.map((p) => (
          <button
            key={p.name}
            onClick={() => select(p)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              selected?.name === p.name
                ? "border-primary/40 bg-accent font-medium"
                : "border-transparent hover:bg-accent/50"
            }`}
          >
            <span className="block truncate font-mono text-xs">{p.name}</span>
            {p.description && (
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{p.description}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {selected ? (
          <>
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <span className="font-mono">{selected.name}</span>
                  <Badge variant="outline" className="text-[10px]">Prompt</Badge>
                </CardTitle>
                {selected.description && (
                  <p className="text-xs text-muted-foreground mt-1">{selected.description}</p>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {(selected.arguments ?? []).map((arg) => (
                  <div key={arg.name} className="grid gap-1">
                    <Label className="flex items-center gap-1 text-xs">
                      <span className="font-mono">{arg.name}</span>
                      {arg.required && <span className="text-destructive">*</span>}
                    </Label>
                    {arg.description && (
                      <p className="text-[11px] text-muted-foreground">{arg.description}</p>
                    )}
                    <Input
                      value={args[arg.name] ?? ""}
                      onChange={(e) => setArgs((prev) => ({ ...prev, [arg.name]: e.target.value }))}
                      placeholder={arg.description ?? arg.name}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
                <Button size="sm" className="mt-1 w-fit gap-1.5" onClick={handleGet} disabled={loading}>
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  {loading ? "가져오는 중…" : "가져오기"}
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
              <Card>
                <CardHeader className="pb-1 pt-3">
                  <CardTitle className="text-xs text-muted-foreground">메시지 결과</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {result.messages.map((m, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <Badge
                        variant={m.role === "user" ? "secondary" : "outline"}
                        className="w-fit text-[10px]"
                      >
                        {m.role}
                      </Badge>
                      <pre className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs leading-relaxed">
                        {m.content.text ?? JSON.stringify(m.content)}
                      </pre>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            좌측에서 Prompt를 선택하세요.
          </div>
        )}
      </div>
    </div>
  );
}
