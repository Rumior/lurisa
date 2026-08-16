import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const interests = await prisma.user_interests.findMany({
      where: { userId },
      orderBy: [{ isFollowed: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ interests });
  } catch (err) {
    console.error("[GlobalUpdates API] Interests GET error:", err);
    return NextResponse.json({ error: "Failed to load interests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { topic, action } = body;

    if (!topic || typeof topic !== "string" || topic.length > 100) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
    }

    const validActions = ["follow", "unfollow", "hide", "unhide", "reduce", "increase"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const existing = await prisma.user_interests.findUnique({
      where: { userId_topic: { userId, topic: topic.toLowerCase() } },
    });

    let updated;

    if (action === "follow") {
      updated = await prisma.user_interests.upsert({
        where: { userId_topic: { userId, topic: topic.toLowerCase() } },
        update: { isFollowed: true, isHidden: false, weight: { increment: 0.2 } },
        create: { userId, topic: topic.toLowerCase(), isFollowed: true, weight: 1.0 },
      });
    } else if (action === "unfollow") {
      if (existing) {
        updated = await prisma.user_interests.update({
          where: { id: existing.id },
          data: { isFollowed: false, weight: Math.max(0, existing.weight - 0.2) },
        });
      }
    } else if (action === "hide") {
      updated = await prisma.user_interests.upsert({
        where: { userId_topic: { userId, topic: topic.toLowerCase() } },
        update: { isHidden: true, isFollowed: false },
        create: { userId, topic: topic.toLowerCase(), isHidden: true, isFollowed: false, weight: 0 },
      });
    } else if (action === "unhide") {
      if (existing) {
        updated = await prisma.user_interests.update({
          where: { id: existing.id },
          data: { isHidden: false },
        });
      }
    } else if (action === "reduce") {
      if (existing) {
        updated = await prisma.user_interests.update({
          where: { id: existing.id },
          data: { weight: Math.max(0, existing.weight - 0.3) },
        });
      }
    } else if (action === "increase") {
      if (existing) {
        updated = await prisma.user_interests.update({
          where: { id: existing.id },
          data: { weight: Math.min(3, existing.weight + 0.3), isFollowed: true },
        });
      }
    }

    try {
      await fetch(`${process.env.APP_URL}/api/jobs/global-updates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Secret": process.env.WORKER_SECRET || "",
        },
        body: JSON.stringify({ action: "recompute-rankings", userId }),
      });
    } catch { }

    const interests = await prisma.user_interests.findMany({
      where: { userId },
      orderBy: [{ isFollowed: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ interests, updated });
  } catch (err) {
    console.error("[GlobalUpdates API] Interests POST error:", err);
    return NextResponse.json({ error: "Failed to update interests" }, { status: 500 });
  }
}