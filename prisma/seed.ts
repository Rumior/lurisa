import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@lurisa.app';
  const existing = await prisma.users.findUnique({ where: { email } });
  if (!existing) {
    await prisma.users.create({
      data: {
        name: 'Demo User',
        email,
        passwordHash: await bcrypt.hash('demopassword123', 12),
        consentGiven: true,
        consentGivenAt: new Date(),
        timezone: 'UTC',
        morningTime: '08:00',
        eveningTime: '20:00',
      },
    });
    console.log('Demo user: demo@lurisa.app / demopassword123');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());