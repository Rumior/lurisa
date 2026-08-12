export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { detectPatterns } from "@/lib/insights/patterns";
import { findCrossMemoryInsights } from "@/lib/insights/cross-memory";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [patterns, crossInsights] = await Promise.all([
      detectPatterns(token.id),
      findCrossMemoryInsights(token.id),
    ]);

    return NextResponse.json({ patterns, crossInsights });
  } catch (error) {
    console.error("[INSIGHTS] Patterns error:", error);
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}
