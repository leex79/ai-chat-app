import { NextRequest, NextResponse } from "next/server";
import { mcpDisconnect } from "@/lib/server/mcp-manager";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let id: string;
  try {
    const body = await req.json();
    id = body.id as string;
    if (!id) throw new Error("id가 필요합니다.");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  await mcpDisconnect(id);
  return NextResponse.json({ ok: true });
}
