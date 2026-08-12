export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const goals = await prisma.goals.findMany({
      where: { userId: token.id },
      orderBy: { updatedAt: "desc" },
    });

    const enriched = await Promise.all(
      goals.map(async (goal) => {
        const memoryCount = await prisma.memories.count({
          where: {
            userId: token.id,
            category: goal.category,
            status: "ACTIVE",
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        });
        return { ...goal, recentMemoryCount: memoryCount };
      })
    );

    return NextResponse.json({ goals: enriched });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}
