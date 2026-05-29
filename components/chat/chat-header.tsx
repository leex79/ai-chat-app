import Link from "next/link";
import { Bot, Server, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChatHeader() {
  return (
    <header className="flex items-center justify-between bg-background px-4 py-3">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="font-semibold text-foreground">AI Chat</span>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/mcp"
          aria-label="MCP 서버 관리"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5 text-muted-foreground")}
        >
          <Server className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline text-xs">서버</span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          aria-label="모델 설정"
          disabled
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline text-xs">설정</span>
        </Button>
      </div>
    </header>
  );
}
