import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    const lastRun = await redis.get("global-updates:last-worker-run");
    const workerHealthy = lastRun
      ? Date.now() - parseInt(lastRun) < 1000 * 60 * 30
      : false;

    return NextResponse.json({
      status: "healthy",
      database: "connected",
      cache: "connected",
      worker: workerHealthy ? "active" : "idle_or_unknown",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
