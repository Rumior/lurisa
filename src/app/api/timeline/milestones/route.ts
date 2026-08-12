export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const milestones = await prisma.timeline_events.findMany({
      where: { userId: token.id, eventType: "MILESTONE" },
      orderBy: { eventDate: "desc" },
      take: 50,
    });

    return NextResponse.json({ milestones });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch milestones" }, { status: 500 });
  }
}
