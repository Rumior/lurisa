import { prisma } from './db';
import { redis } from './redis';

export async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user ? adminEmails.includes(user.email.toLowerCase()) : false;
}

export async function getSystemStats() {
  const [
    totalUsers,
    totalMemories,
    totalConversations,
    totalGoals,
    activeToday,
    recentSignups,
  ] = await Promise.all([
    prisma.users.count(),
    prisma.memories.count({ where: { status: 'ACTIVE' } }),
    prisma.conversations.count(),
    prisma.goals.count({ where: { status: 'ACTIVE' } }),
    prisma.devices.count({
      where: {
        lastSeenAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.users.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    totalUsers,
    totalMemories,
    totalConversations,
    totalGoals,
    activeToday,
    recentSignups,
  };
}

export async function getUserList(page = 1, pageSize = 50) {
  const skip = (page - 1) * pageSize;
  const [users, total] = await Promise.all([
    prisma.users.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        memoryPaused: true,
        _count: {
          select: {
            memories: true,
            conversations: true,
            goals: true,
          },
        },
      },
    }),
    prisma.users.count(),
  ]);

  return {
    users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getAuditLogs(page = 1, pageSize = 100) {
  const skip = (page - 1) * pageSize;
  const [logs, total] = await Promise.all([
    prisma.audit_log.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        action: true,
        resource: true,
        details: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    }),
    prisma.audit_log.count(),
  ]);

  return {
    logs,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
