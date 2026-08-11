import { prisma } from './db';

export async function logAudit(params: {
  userId?: string;
  action: string;
  resource?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await prisma.audit_log.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        details: params.details,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}
