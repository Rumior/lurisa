import "dotenv/config";
import { prisma } from "@/lib/db";
import { runMemoryLifecycle } from "@/lib/memory/lifecycle";
import { redis } from "@/lib/redis";

async function run() {
  console.log("[Lifecycle Worker] Starting...");

  const users = await prisma.users.findMany({
    where: { memoryPaused: false },
    select: { id: true },
    take: 100,
  });

  for (const user of users) {
    const lockKey = `lifecycle:${user.id}:lock`;
    const hasLock = await redis.set(lockKey, "1", "EX", 3600, "NX");
    if (!hasLock) continue;

    try {
      const result = await runMemoryLifecycle(user.id);
      console.log(`[Lifecycle Worker] User ${user.id}: decayed=${result.decayed.length}, expired=${result.expired}, cleaned=${result.cleaned}`);
    } catch (err) {
      console.error(`[Lifecycle Worker] Failed for ${user.id}:`, err);
    } finally {
      await redis.del(lockKey);
    }
  }

  console.log("[Lifecycle Worker] Complete");
  await prisma.$disconnect();
  process.exit(0);
}

run();