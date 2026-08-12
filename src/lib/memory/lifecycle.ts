import { prisma } from "@/lib/db";
import { computeRecencyDecay } from "@/lib/importance-engine";
import { logAudit } from "@/lib/audit";

interface DecayResult {
  memoryId: string;
  oldImportance: number;
  newImportance: number;
}

export async function applyImportanceDecay(userId: string): Promise<DecayResult[]> {
  const memories = await prisma.memories.findMany({
    where: {
      userId,
      status: "ACTIVE",
      type: { in: ["LONG_TERM", "TEMPORARY", "EMOTIONAL"] },
    },
    select: {
      id: true,
      importance: true,
      createdAt: true,
      type: true,
      lastReinforcedAt: true,
    },
    take: 200,
  });

  const results: DecayResult[] = [];

  for (const mem of memories) {
    const decay = computeRecencyDecay(mem.createdAt, mem.type, mem.lastReinforcedAt);
    const newImportance = Math.max(0.05, mem.importance * decay);

    if (Math.abs(newImportance - mem.importance) > 0.01) {
      await prisma.memories.update({
        where: { id: mem.id },
        data: { importance: newImportance },
      });
      results.push({
        memoryId: mem.id,
        oldImportance: mem.importance,
        newImportance,
      });
    }
  }

  return results;
}

export async function expireTemporaryMemories(userId: string): Promise<number> {
  const result = await prisma.memories.updateMany({
    where: {
      userId,
      status: "ACTIVE",
      type: "TEMPORARY",
      expiresAt: { lt: new Date() },
    },
    data: { status: "ARCHIVED" },
  });

  if (result.count > 0) {
    await logAudit({
      userId,
      action: "memory.lifecycle.expire",
      details: `Archived ${result.count} expired temporary memories`,
    });
  }

  return result.count;
}

export async function cleanupDeletedMemories(userId: string, daysOld: number = 30): Promise<number> {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const result = await prisma.memories.deleteMany({
    where: {
      userId,
      status: "DELETED",
      updatedAt: { lt: cutoff },
    },
  });
  return result.count;
}

export async function runMemoryLifecycle(userId: string): Promise<{
  decayed: DecayResult[];
  expired: number;
  cleaned: number;
}> {
  const [decayed, expired, cleaned] = await Promise.all([
    applyImportanceDecay(userId),
    expireTemporaryMemories(userId),
    cleanupDeletedMemories(userId),
  ]);

  return { decayed, expired, cleaned };
}