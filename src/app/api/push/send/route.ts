export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import webpush from "web-push";

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) {
      return NextResponse.json({ error: "Push not configured" }, { status: 503 });
    }

    webpush.setVapidDetails("mailto:admin@lurisa.app", publicKey, privateKey);

    const { title, body, tag, requireInteraction } = await req.json();
    const subscriptions = await prisma.push_subscriptions.findMany({
      where: { userId: token.id },
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, tag, requireInteraction })
        )
      )
    );

    const failed = results.filter((r) => r.status === "rejected").length;
    return NextResponse.json({ sent: subscriptions.length - failed, failed });
  } catch (error) {
    console.error("[PUSH] Send error:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
