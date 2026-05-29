"use client";

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ContentPart {
  type: string;
  data?: string;
  mimeType?: string;
  text?: string;
}

function extractContentParts(result: unknown): ContentPart[] | null {
  if (typeof result !== "object" || result === null) return null;
  const r = result as Record<string, unknown>;
  if (!Array.isArray(r.content)) return null;
  return r.content as ContentPart[];
}

interface ToolResultContentProps {
  result: unknown;
}

export function ToolResultContent({ result }: ToolResultContentProps) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const parts = extractContentParts(result);

  if (!parts) {
    const text =
      typeof result === "string"
        ? result
        : JSON.stringify(result, null, 2);
    return (
      <pre className={cn(
        "overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 font-mono leading-relaxed",
        "text-[11px]",
      )}>
        {text}
      </pre>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {parts.map((part, i) => {
          if (part.type === "image" && part.data) {
            const src = `data:${part.mimeType ?? "image/png"};base64,${part.data}`;
            return (
              <div key={i}>
                <img
                  src={src}
                  alt={`이미지 결과 ${i + 1}`}
                  className="max-h-40 cursor-pointer rounded border border-border object-contain transition-opacity hover:opacity-80"
                  onClick={() => setLightboxSrc(src)}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  클릭해서 확대
                </p>
              </div>
            );
          }

          if (part.type === "text") {
            return (
              <pre
                key={i}
                className={cn(
                  "overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 font-mono leading-relaxed",
                  "text-[11px]",
                )}
              >
                {part.text ?? ""}
              </pre>
            );
          }

          return (
            <pre
              key={i}
              className={cn(
                "overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 font-mono leading-relaxed",
                "text-[11px]",
              )}
            >
              {JSON.stringify(part, null, 2)}
            </pre>
          );
        })}
      </div>

      <Dialog open={lightboxSrc !== null} onOpenChange={(open) => { if (!open) setLightboxSrc(null); }}>
        <DialogContent className="max-w-4xl p-2">
          {lightboxSrc && (
            <img
              src={lightboxSrc}
              alt="확대 이미지"
              className="max-h-[80vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
