export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { runMemoryLifecycle } from "@/lib/memory/lifecycle";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await runMemoryLifecycle(token.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[LIFECYCLE] Error:", error);
    return NextResponse.json({ error: "Lifecycle processing failed" }, { status: 500 });
  }
}
