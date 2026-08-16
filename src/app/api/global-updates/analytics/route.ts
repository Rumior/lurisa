import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const { event, eventId } = body;

    if (!eventId || !event) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const eventRecord: any = {
      eventId: eventId,
      userId,
      impressionAt: new Date(),
      sponsored: false,
    };

    if (event === "open") eventRecord.openAt = new Date();
    else if (event === "save") eventRecord.saveAt = new Date();
    else if (event === "research") eventRecord.researchAt = new Date();
    else if (event === "source-click") eventRecord.sourceClickAt = new Date();
    else if (event === "hide") eventRecord.hideAt = new Date();
    else if (event === "not-relevant") eventRecord.notRelevantAt = new Date();

    await prisma.global_update_analytics.create({ data: eventRecord });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[GlobalUpdates API] Analytics error:", err);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}