"use client";

import { useState } from "react";
import { AlertCircle, BookOpen, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { McpResource } from "@/lib/mcp-types";

interface ResourceResult {
  contents: { uri: string; text?: string; mimeType?: string }[];
}

interface TabResourcesProps {
  resources: McpResource[];
  onReadResource: (uri: string) => Promise<ResourceResult>;
}

export function TabResources({ resources, onReadResource }: TabResourcesProps) {
  const [selected, setSelected] = useState<McpResource | null>(null);
  const [result, setResult] = useState<ResourceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRead = async (r: McpResource) => {
    setSelected(r);
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await onReadResource(r.uri);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
        <BookOpen className="h-8 w-8 opacity-30" aria-hidden="true" />
        <p className="text-sm">이 서버에 등록된 Resource가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="w-52 shrink-0 flex flex-col gap-1">
        {resources.map((r) => (
          <button
            key={r.uri}
            onClick={() => handleRead(r)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              selected?.uri === r.uri
                ? "border-primary/40 bg-accent font-medium"
                : "border-transparent hover:bg-accent/50"
            }`}
          >
            <span className="block truncate text-xs font-medium">{r.name}</span>
            <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{r.uri}</span>
            {r.mimeType && (
              <Badge variant="secondary" className="mt-1 text-[9px] px-1 py-0">{r.mimeType}</Badge>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {selected ? (
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4" aria-hidden="true" />
                {selected.name}
              </CardTitle>
              <p className="font-mono text-[11px] text-muted-foreground">{selected.uri}</p>
              {selected.description && (
                <p className="text-xs text-muted-foreground">{selected.description}</p>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">읽는 중…</p>
              ) : error ? (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              ) : result ? (
                result.contents.map((c, i) => (
                  <pre
                    key={i}
                    className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 font-mono text-xs leading-relaxed"
                  >
                    {c.text ?? `(binary / no text content for ${c.uri})`}
                  </pre>
                ))
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            좌측에서 Resource를 선택하면 자동으로 읽어옵니다.
          </div>
        )}
      </div>
    </div>
  );
}
