"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReactNode } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  isDisabled?: boolean;
  toolSlot?: ReactNode;
}

export function ChatInput({ onSend, isDisabled = false, toolSlot }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isDisabled) return;
    onSend(trimmed);
    setValue("");
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div className="flex items-end gap-2">
        {toolSlot}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요… (/ 로 프롬프트 힌트)"
          rows={1}
          disabled={isDisabled}
          className="max-h-36 min-h-[40px] resize-none leading-relaxed"
          aria-label="채팅 메시지 입력"
        />
        <Button
          onClick={handleSend}
          disabled={isDisabled || !value.trim()}
          size="icon"
          aria-label="전송"
          className="shrink-0"
        >
          <SendHorizonal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <p className="mt-1.5 text-center text-xs text-muted-foreground">
        Enter로 전송 · Shift+Enter로 줄바꿈
      </p>
    </div>
  );
}
