export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { explainSuggestion } from "@/lib/insights/explainability";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { suggestionText, sourceMemoryIds } = await req.json();
    if (!suggestionText || !Array.isArray(sourceMemoryIds)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const explanation = await explainSuggestion(token.id, suggestionText, sourceMemoryIds);
    return NextResponse.json(explanation);
  } catch (error) {
    console.error("[INSIGHTS] Explain error:", error);
    return NextResponse.json({ error: "Failed to explain" }, { status: 500 });
  }
}
