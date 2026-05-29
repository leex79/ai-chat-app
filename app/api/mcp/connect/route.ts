import { NextRequest, NextResponse } from "next/server";
import { mcpConnect } from "@/lib/server/mcp-manager";
import type { McpServerConfig } from "@/lib/mcp-types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let server: McpServerConfig;
  try {
    const body = await req.json();
    server = body.server as McpServerConfig;
    if (!server?.id) throw new Error("서버 정보가 올바르지 않습니다.");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  try {
    const capabilities = await mcpConnect(server);
    return NextResponse.json({ capabilities });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
