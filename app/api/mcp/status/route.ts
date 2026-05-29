import { NextResponse } from "next/server";
import { mcpListSessions } from "@/lib/server/mcp-manager";

export const runtime = "nodejs";

export async function GET() {
  try {
    const sessions = await mcpListSessions();
    return NextResponse.json({ sessions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
