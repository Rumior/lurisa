// diagnose.ts
import { prisma } from './src/lib/db';

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: npx tsx diagnose.ts <user-id>');
  process.exit(1);
}

async function diagnose() {
  console.log('\n=== LAYER 1: Recent Memories ===');
  const memories = await prisma.memories.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      category: { in: ['INTERESTS', 'CAREER', 'PROJECTS', 'FINANCE', 'EDUCATION'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { statement: true, category: true, confidence: true, createdAt: true },
  });
  
  if (memories.length === 0) {
    console.log('❌ NO MEMORIES FOUND — Chat extraction pipeline is broken or not run');
  } else {
    memories.forEach((m) => {
      console.log(`[${m.category}] ${m.statement.slice(0, 80)}... (conf: ${m.confidence})`);
    });
  }

  console.log('\n=== LAYER 2: Personal Model ===');
  const model = await prisma.user_personal_models.findUnique({
    where: { userId },
    select: {
      workInterests: true,
      currentGoalsSummary: true,
      recurringConcerns: true,
      lifePhase: true,
      updatedAt: true,
    },
  });
  
  if (!model) {
    console.log('❌ NO PERSONAL MODEL — Inference pipeline has not run for this user');
  } else {
    console.log('Work Interests:', model.workInterests || '(empty)');
    console.log('Goals Summary:', model.currentGoalsSummary || '(empty)');
    console.log('Recurring Concerns:', model.recurringConcerns || '(empty)');
    console.log('Life Phase:', model.lifePhase || '(empty)');
    console.log('Last Updated:', model.updatedAt);
  }

  console.log('\n=== LAYER 3: Explicit Interests ===');
  const interests = await prisma.user_interests.findMany({
    where: { userId, isFollowed: true },
    select: { topic: true, weight: true },
  });
  console.log(interests.map((i) => `${i.topic} (w:${i.weight})`).join(', ') || '(none)');

  console.log('\n=== LAYER 4: Recent Rankings ===');
  const rankings = await prisma.global_update_rankings.findMany({
    where: { userId },
    orderBy: { compositeScore: 'desc' },
    take: 5,
    include: {
      event: { select: { headline: true, topics: true, importanceScore: true } },
    },
  });
  
  if (rankings.length === 0) {
    console.log('❌ NO RANKINGS — Worker has not run');
  } else {
    rankings.forEach((r) => {
      console.log(`Score: ${r.compositeScore.toFixed(3)} | ${r.event.headline.slice(0, 60)}...`);
    });
  }

  await prisma.$disconnect();
}

diagnose().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});