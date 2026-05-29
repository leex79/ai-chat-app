import { NextRequest, NextResponse } from "next/server";
import { mcpReadResource } from "@/lib/server/mcp-manager";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let id: string, uri: string;
  try {
    const body = await req.json();
    id = body.id as string;
    uri = body.uri as string;
    if (!id || !uri) throw new Error("id와 uri가 필요합니다.");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "요청 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  try {
    const result = await mcpReadResource(id, uri);
    return NextResponse.json(result);
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "NOT_CONNECTED") {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    return NextResponse.json({ error: e.message ?? String(err) }, { status: 500 });
  }
}
