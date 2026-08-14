import { prisma } from '@/lib/db';
import { withRetry } from '@/lib/error-handler';
import { ResearchDepth, ResearchResult, ResearchSessionRecord, ResearchStatus } from './types';
import { createResearchPlan } from './planner';
import { searchWeb } from './search';
import { browsePage } from './browser';
import { extractClaimsFromSource } from './evidence';
import { detectContradictions } from './contradiction';
import { synthesizeFindings } from './synthesis';
import { personalizeFindings } from './personalizer';

export { detectResearchIntent } from './intent-detector';

const MAX_QUICK_SOURCES = 5;
const MAX_DEEP_SOURCES = 12;
const MAX_REPORT_SOURCES = 20;

export async function executeQuickResearch(
  userId: string,
  query: string,
  objective: string
): Promise<ResearchResult> {
  console.log(`[RESEARCH] Starting quick research for user ${userId}: ${objective}`);

  const plan = await createResearchPlan(query, 'QUICK');
  const sources = await gatherSources(plan, MAX_QUICK_SOURCES);
  const processedSources = await processSources(sources);
  const contradictions = await detectContradictions(processedSources.flatMap(s => s.claims));
  const findings = await synthesizeFindings(processedSources, contradictions);
  const personalization = await personalizeFindings(userId, query, findings);

  return {
    summary: buildSummary(findings, contradictions),
    findings,
    contradictions,
    sources: processedSources,
    recommendation: personalization.recommendation,
    personalInterpretation: personalization.interpretation,
  };
}

export async function executeDeepResearch(
  userId: string,
  query: string,
  objective: string
): Promise<ResearchSessionRecord> {
  const session = await createResearchSession(userId, query, 'DEEP', objective);
  
  try {
    await updateSessionStatus(session.id, 'SEARCHING');
    const plan = await createResearchPlan(query, 'DEEP');
    
    await updateSessionStatus(session.id, 'ANALYZING');
    const sources = await gatherSources(plan, MAX_DEEP_SOURCES);
    const processedSources = await processSources(sources);
    
    await updateSessionStatus(session.id, 'SYNTHESIZING');
    const contradictions = await detectContradictions(processedSources.flatMap(s => s.claims));
    const findings = await synthesizeFindings(processedSources, contradictions);
    const personalization = await personalizeFindings(userId, query, findings);

    await saveResearchResults(session.id, processedSources, findings, contradictions, personalization);

    await prisma.research_sessions.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        personalInterpretation: personalization.interpretation,
        recommendation: personalization.recommendation,
      },
    });

    return { ...session, status: 'COMPLETED', completedAt: new Date() };
  } catch (error) {
    console.error(`[RESEARCH] Deep research failed for session ${session.id}:`, error);
    await prisma.research_sessions.update({
      where: { id: session.id },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}

async function createResearchSession(
  userId: string,
  query: string,
  depth: ResearchDepth,
  objective?: string
): Promise<ResearchSessionRecord> {
  const session = await prisma.research_sessions.create({
    data: {
      userId,
      query,
      objective: objective || query,
      depth,
      status: 'PLANNING',
    },
  });
  
  return {
    id: session.id,
    userId: session.userId,
    query: session.query,
    objective: session.objective || undefined,
    depth: session.depth as ResearchDepth,
    status: session.status as ResearchStatus,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt || undefined,
  };
}

async function updateSessionStatus(sessionId: string, status: ResearchStatus): Promise<void> {
  await prisma.research_sessions.update({
    where: { id: sessionId },
    data: { status, updatedAt: new Date() },
  });
}

async function gatherSources(plan: { questions: Array<{ question: string }> }, maxSources: number) {
  const searchQueries = plan.questions.map(q => q.question).slice(0, 3);
  const allResults: Awaited<ReturnType<typeof searchWeb>> = [];
  
  for (const query of searchQueries) {
    try {
      const results = await withRetry(
        () => searchWeb(query, { limit: Math.ceil(maxSources / searchQueries.length) }),
        { maxRetries: 2, baseDelayMs: 1000, maxDelayMs: 5000 }
      );
      allResults.push(...results);
    } catch (err) {
      console.error(`[RESEARCH] Search failed for "${query}":`, err);
    }
  }

  const seen = new Set<string>();
  return allResults.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  }).slice(0, maxSources);
}

async function processSources(sources: Awaited<ReturnType<typeof searchWeb>>) {
  const processed = [];
  
  for (const src of sources) {
    try {
      const page = await withRetry(
        () => browsePage(src.url),
        { maxRetries: 1, baseDelayMs: 500, maxDelayMs: 2000 }
      );
      
      const source = {
        title: page.title || src.title,
        url: src.url,
        source: src.source,
        sourceType: classifySourceType(src.url),
        credibilityScore: estimateCredibility(src.url),
        relevanceScore: 0.7,
        content: page.content,
        claims: [] as any[],
      };
      
      const claims = await extractClaimsFromSource(source);
      source.claims = claims;
      source.relevanceScore = claims.length > 0 ? 0.8 : 0.4;
      
      processed.push(source);
    } catch (err) {
      console.error(`[RESEARCH] Failed to process source ${src.url}:`, err);
    }
  }
  
  return processed;
}

function classifySourceType(url: string): 'PRIMARY' | 'SECONDARY' | 'TERTIARY' {
  const hostname = url.toLowerCase();
  if (hostname.includes('.gov') || hostname.includes('.edu') || hostname.includes('official')) return 'PRIMARY';
  if (hostname.includes('news') || hostname.includes('bbc') || hostname.includes('reuters') || hostname.includes('bloomberg')) return 'SECONDARY';
  return 'TERTIARY';
}

function estimateCredibility(url: string): number {
  const hostname = url.toLowerCase();
  if (hostname.includes('.gov') || hostname.includes('.edu')) return 0.9;
  if (hostname.includes('wikipedia')) return 0.7;
  if (hostname.includes('news') || hostname.includes('bbc') || hostname.includes('reuters')) return 0.8;
  if (hostname.includes('blog') || hostname.includes('medium')) return 0.5;
  return 0.6;
}

function buildSummary(findings: any[], contradictions: any[]): string {
  let summary = `I found ${findings.length} key finding${findings.length !== 1 ? 's' : ''}`;
  if (contradictions.length > 0) {
    summary += `, including ${contradictions.length} contradiction${contradictions.length > 1 ? 's' : ''} that needed cross-checking`;
  }
  summary += '.';
  return summary;
}

async function saveResearchResults(
  sessionId: string,
  sources: any[],
  findings: any[],
  contradictions: any[],
  personalization: { interpretation: string; recommendation?: string }
): Promise<void> {
  for (const src of sources) {
    await prisma.research_sources.create({
      data: {
        sessionId,
        title: src.title,
        url: src.url,
        sourceType: src.sourceType,
        credibilityScore: src.credibilityScore,
        relevanceScore: src.relevanceScore,
        content: src.content?.slice(0, 5000),
        rawClaims: JSON.stringify(src.claims),
      },
    });
  }

  for (const f of findings) {
    await prisma.research_findings.create({
      data: {
        sessionId,
        category: f.category,
        finding: f.finding,
        confidence: f.confidence,
        sourceIds: f.sourceIds,
        personalRelevance: f.personalRelevance,
      },
    });
  }

  for (const c of contradictions) {
    await prisma.research_contradictions.create({
      data: {
        sessionId,
        claimA: c.claimA,
        claimB: c.claimB,
        sourceAId: c.sourceA,
        sourceBId: c.sourceB,
        explanation: c.explanation,
      },
    });
  }
}

export async function getResearchSession(sessionId: string) {
  return prisma.research_sessions.findUnique({
    where: { id: sessionId },
    include: {
      sources: true,
      findings: true,
      contradictions: true,
    },
  });
}

export async function getRecentResearchContext(userId: string, limit: number = 3): Promise<string> {
  const sessions = await prisma.research_sessions.findMany({
    where: { userId, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { findings: true },
  });

  if (sessions.length === 0) return '';

  return `\n\nRECENT RESEARCH:\n${sessions.map((s, i) => {
    const topFindings = s.findings.slice(0, 2).map(f => `- ${f.finding}`).join('\n');
    return `${i + 1}. ${s.objective || s.query}:\n${topFindings}`;
  }).join('\n\n')}`;
}