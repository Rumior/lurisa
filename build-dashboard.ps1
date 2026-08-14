# build-dashboard.ps1
# Rebuilds the Lurisa landing dashboard into an adaptive personal command centre

$projectRoot = "C:\Users\HP\Desktop\lurisa"
$ErrorActionPreference = "Continue"

function Write-ProjectFile($relativePath, $content) {
    $fullPath = Join-Path $projectRoot $relativePath
    try {
        $dir = Split-Path $fullPath -Parent
        if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
        $utf8 = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($fullPath, $content, $utf8)
        Write-Host "  OK: $relativePath" -ForegroundColor Green
    } catch {
        Write-Host "  FAIL: $relativePath -> $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "=== BUILDING ADAPTIVE DASHBOARD ===" -ForegroundColor Cyan

# ============================================================================
# 1. Dashboard API — aggregates everything in one request
# ============================================================================
Write-ProjectFile "src\app\api\dashboard\route.ts" @'
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import { detectPatterns } from "@/lib/insights/patterns";
import { findCrossMemoryInsights } from "@/lib/insights/cross-memory";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [user, activeGoals, researchSessions, timelineEvents, recentConversations, patterns, crossInsights] =
      await Promise.all([
        prisma.users.findUnique({
          where: { id: token.id },
          select: { id: true, name: true, email: true, createdAt: true },
        }),

        prisma.goals.findMany({
          where: { userId: token.id, status: "ACTIVE" },
          orderBy: [{ targetDate: "asc" }, { createdAt: "desc" }],
          take: 6,
          select: {
            id: true,
            title: true,
            description: true,
            targetDate: true,
            status: true,
            createdAt: true,
          },
        }),

        prisma.research_sessions.findMany({
          where: { userId: token.id },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            query: true,
            objective: true,
            depth: true,
            status: true,
            createdAt: true,
            completedAt: true,
            recommendation: true,
            personalInterpretation: true,
          },
        }),

        prisma.timeline_events.findMany({
          where: { userId: token.id, createdAt: { gte: thirtyDaysAgo } },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            description: true,
            eventType: true,
            eventDate: true,
            createdAt: true,
          },
        }),

        prisma.conversations.findMany({
          where: { userId: token.id, updatedAt: { gte: sevenDaysAgo } },
          orderBy: { updatedAt: "desc" },
          take: 5,
          select: { id: true, title: true, updatedAt: true },
        }),

        detectPatterns(token.id).catch(() => []),
        findCrossMemoryInsights(token.id).catch(() => []),
      ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ── Compute greeting ──
    const hour = now.getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";
    const userName = user.name?.split(" ")[0] || "there";

    // ── Compute "Today" priorities ──
    const priorities: any[] = [];

    // Urgent goals (due within 3 days or overdue)
    for (const goal of activeGoals) {
      if (goal.targetDate) {
        const ms = goal.targetDate.getTime() - now.getTime();
        const daysUntil = Math.ceil(ms / (1000 * 60 * 60 * 24));
        if (daysUntil <= 3) {
          priorities.push({
            type: "goal",
            id: goal.id,
            title: goal.title,
            subtitle: goal.description || "Active goal",
            href: "/goals",
            urgency: daysUntil < 0 ? "overdue" : daysUntil === 0 ? "critical" : "high",
            dueText:
              daysUntil < 0
                ? "Overdue"
                : daysUntil === 0
                ? "Due today"
                : daysUntil === 1
                ? "Due tomorrow"
                : `Due in ${daysUntil} days`,
          });
        }
      }
    }

    // Active research
    const activeResearch = researchSessions.filter(
      (s) => s.status !== "COMPLETED" && s.status !== "FAILED"
    );
    if (activeResearch.length > 0) {
      const r = activeResearch[0];
      priorities.push({
        type: "research",
        id: r.id,
        title: r.objective || r.query,
        subtitle: `${r.depth.toLowerCase()} research · ${r.status.toLowerCase()}`,
        href: "/research",
        urgency: "medium",
        dueText: "In progress",
      });
    }

    // Goals due within 7 days (lower priority)
    for (const goal of activeGoals) {
      if (goal.targetDate) {
        const ms = goal.targetDate.getTime() - now.getTime();
        const daysUntil = Math.ceil(ms / (1000 * 60 * 60 * 24));
        if (daysUntil > 3 && daysUntil <= 7) {
          priorities.push({
            type: "goal",
            id: goal.id,
            title: goal.title,
            subtitle: goal.description || "Upcoming goal",
            href: "/goals",
            urgency: "low",
            dueText: `Due in ${daysUntil} days`,
          });
        }
      }
    }

    // ── Compute subtitle ──
    const urgentCount = priorities.filter((p) => p.urgency === "critical" || p.urgency === "high" || p.urgency === "overdue").length;
    let subtitle = "Here's what matters right now.";
    if (urgentCount === 1) subtitle = "You have 1 important thing today.";
    else if (urgentCount > 1) subtitle = `You have ${urgentCount} important things today.`;
    else if (priorities.length > 0) subtitle = `You have ${priorities.length} thing${priorities.length > 1 ? "s" : ""} to focus on.`;
    else if (activeResearch.length > 0) subtitle = "Your research is in progress.";
    else subtitle = "Everything is calm. What would you like to work on?";

    // ── Compute "Something I've Noticed" ──
    let noticed: any = null;
    const topPattern = patterns?.[0];
    if (topPattern && topPattern.confidence >= 0.55) {
      noticed = {
        title: topPattern.pattern,
        description: topPattern.suggestion,
        evidence: `Based on ${topPattern.frequency} observation${topPattern.frequency > 1 ? "s" : ""} in the last 30 days`,
        confidence: topPattern.confidence,
        examples: topPattern.examples?.slice(0, 2) || [],
      };
    } else if (crossInsights?.[0]) {
      const ci = crossInsights[0];
      noticed = {
        title: ci.insight || "A connection across your memories",
        description: ci.explanation || "",
        evidence: "Based on cross-memory analysis",
        confidence: ci.confidence || 0.6,
        examples: [],
      };
    }

    // ── Recent Life ──
    const recentLife: any[] = [];

    researchSessions
      .filter((s) => s.status === "COMPLETED" && s.completedAt && new Date(s.completedAt) >= sevenDaysAgo)
      .forEach((s) => {
        recentLife.push({
          id: s.id,
          date: s.completedAt,
          label: "Research completed",
          description: s.objective || s.query,
          type: "research",
          href: "/research",
        });
      });

    timelineEvents.slice(0, 6).forEach((e) => {
      recentLife.push({
        id: e.id,
        date: e.createdAt,
        label: e.eventType === "MILESTONE" ? "Milestone reached" : e.eventType,
        description: e.title,
        type: "timeline",
        href: "/timeline",
      });
    });

    recentConversations.forEach((c) => {
      recentLife.push({
        id: c.id,
        date: c.updatedAt,
        label: "Conversation",
        description: c.title,
        type: "chat",
        href: "/chat",
      });
    });

    recentLife.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const dedupedLife = recentLife.slice(0, 8);

    // ── Active "projects" (goals + research) ──
    const projects: any[] = [];
    activeGoals.slice(0, 3).forEach((g) => {
      const daysUntil = g.targetDate
        ? Math.ceil((g.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      projects.push({
        type: "goal",
        id: g.id,
        title: g.title,
        subtitle: g.description || "Active goal",
        meta: daysUntil !== null ? (daysUntil < 0 ? "Overdue" : daysUntil <= 7 ? `${daysUntil}d left` : "In progress") : "Active",
        href: "/goals",
      });
    });
    researchSessions.slice(0, 2).forEach((r) => {
      projects.push({
        type: "research",
        id: r.id,
        title: r.objective || r.query,
        subtitle: `${r.depth} Research`,
        meta: r.status === "COMPLETED" ? "Complete" : r.status === "FAILED" ? "Failed" : "In progress",
        href: "/research",
      });
    });

    return NextResponse.json({
      user,
      greeting,
      userName,
      subtitle,
      priorities,
      noticed,
      research: {
        active: activeResearch,
        recentCompleted: researchSessions.filter((s) => s.status === "COMPLETED").slice(0, 3),
      },
      goals: {
        active: activeGoals.map((g) => ({
          ...g,
          daysUntil: g.targetDate
            ? Math.ceil((g.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : null,
        })),
      },
      projects: projects.slice(0, 5),
      recentLife: dedupedLife,
    });
  } catch (error) {
    console.error("[DASHBOARD] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
'@

# ============================================================================
# 2. New Dashboard Home Component
# ============================================================================
Write-ProjectFile "src\components\dashboard\dashboard-home.tsx" @'
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sun,
  Moon,
  Sunrise,
  Target,
  BookOpen,
  MessageCircle,
  Sparkles,
  Clock,
  ChevronRight,
  Loader2,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Search,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

interface DashboardData {
  user: { id: string; name?: string | null; email: string };
  greeting: string;
  userName: string;
  subtitle: string;
  priorities: Array<{
    type: string;
    id: string;
    title: string;
    subtitle: string;
    href: string;
    urgency: string;
    dueText: string;
  }>;
  noticed: {
    title: string;
    description: string;
    evidence: string;
    confidence: number;
    examples: string[];
  } | null;
  research: {
    active: any[];
    recentCompleted: any[];
  };
  goals: {
    active: any[];
  };
  projects: Array<{
    type: string;
    id: string;
    title: string;
    subtitle: string;
    meta: string;
    href: string;
  }>;
  recentLife: Array<{
    id: string;
    date: string;
    label: string;
    description: string;
    type: string;
    href: string;
  }>;
}

function TimeIcon({ hour }: { hour: number }) {
  if (hour < 12) return <Sunrise className="w-5 h-5 text-amber-500" />;
  if (hour < 17) return <Sun className="w-5 h-5 text-amber-500" />;
  return <Moon className="w-5 h-5 text-indigo-400" />;
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const config: Record<string, string> = {
    overdue: "bg-terracotta-500/10 text-terracotta-500 border-terracotta-500/20",
    critical: "bg-terracotta-500/10 text-terracotta-500 border-terracotta-500/20",
    high: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    medium: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    low: "bg-sage-500/10 text-sage-600 border-sage-500/20",
  };
  const cls = config[urgency] || config.low;
  const label = urgency === "overdue" ? "Overdue" : urgency === "critical" ? "Due today" : urgency === "high" ? "Soon" : urgency === "medium" ? "In progress" : "Upcoming";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function TypeIcon({ type }: { type: string }) {
  if (type === "goal") return <Target className="w-4 h-4 text-sage-500" />;
  if (type === "research") return <BookOpen className="w-4 h-4 text-indigo-500" />;
  return <Circle className="w-4 h-4 text-stone-400" />;
}

function LifeIcon({ type }: { type: string }) {
  if (type === "research") return <BookOpen className="w-3.5 h-3.5 text-indigo-400" />;
  if (type === "timeline") return <Clock className="w-3.5 h-3.5 text-sage-400" />;
  return <MessageCircle className="w-3.5 h-3.5 text-amber-400" />;
}

export function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEvidence, setShowEvidence] = useState(false);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  const hour = new Date().getHours();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-24">
        <p className="text-stone-500">Could not load your dashboard.</p>
        <button
          onClick={fetchDashboard}
          className="mt-3 text-sm text-indigo-500 hover:text-indigo-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 animate-fade-in">
      {/* ── Contextual Header ── */}
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <TimeIcon hour={hour} />
          <h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300">
            {data.greeting}, {data.userName}.
          </h1>
        </div>
        <p className="text-sm text-charcoal-500 dark:text-parchment-300 pl-8">
          {data.subtitle}
        </p>
        <p className="text-xs text-stone-400 pl-8">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </header>

      {/* ── TODAY ── */}
      {data.priorities.length > 0 && (
        <section className="p-5 rounded-2xl bg-parchment-100 dark:bg-indigo-900 border border-parchment-700/20 dark:border-indigo-800/30">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
            Today
          </h2>
          <div className="space-y-3">
            {data.priorities.map((p) => (
              <Link
                key={`${p.type}-${p.id}`}
                href={p.href}
                className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-indigo-800/50 border border-stone-100 dark:border-indigo-700/30 hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors group"
              >
                <div className="mt-0.5">
                  <TypeIcon type={p.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-stone-800 dark:text-parchment-100 truncate">
                      {p.title}
                    </p>
                    <UrgencyBadge urgency={p.urgency} />
                  </div>
                  <p className="text-xs text-stone-500 dark:text-parchment-300 mt-0.5">
                    {p.subtitle}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── YOUR PRIORITIES + ACTIVE PROJECTS ── */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Priorities */}
        <section className="p-5 rounded-2xl bg-white dark:bg-indigo-900 border border-parchment-700/20 dark:border-indigo-800/30">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
            Your Priorities
          </h2>
          {data.goals.active.length === 0 ? (
            <p className="text-sm text-stone-400">No active goals yet.</p>
          ) : (
            <div className="space-y-3">
              {data.goals.active.slice(0, 4).map((g) => (
                <Link
                  key={g.id}
                  href="/goals"
                  className="block group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-stone-800 dark:text-parchment-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                      {g.title}
                    </p>
                    {g.daysUntil !== null && (
                      <span className={`text-xs ${g.daysUntil < 0 ? "text-terracotta-500" : g.daysUntil <= 3 ? "text-amber-600" : "text-stone-400"}`}>
                        {g.daysUntil < 0 ? "Overdue" : g.daysUntil === 0 ? "Today" : `${g.daysUntil}d left`}
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-stone-100 dark:bg-indigo-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sage-500 rounded-full transition-all"
                      style={{ width: `${Math.max(5, Math.min(100, 100 - (g.daysUntil > 0 ? g.daysUntil * 8 : 0)))}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Active Projects */}
        <section className="p-5 rounded-2xl bg-white dark:bg-indigo-900 border border-parchment-700/20 dark:border-indigo-800/30">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
            Active Projects
          </h2>
          {data.projects.length === 0 ? (
            <p className="text-sm text-stone-400">No active projects.</p>
          ) : (
            <div className="space-y-3">
              {data.projects.map((proj) => (
                <Link
                  key={`${proj.type}-${proj.id}`}
                  href={proj.href}
                  className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-indigo-800/30 hover:bg-stone-100 dark:hover:bg-indigo-800/50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 dark:text-parchment-100 truncate">
                      {proj.title}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-parchment-300 truncate">
                      {proj.subtitle}
                    </p>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ml-2 ${
                    proj.meta === "Complete" ? "text-emerald-600" :
                    proj.meta === "Overdue" ? "text-terracotta-500" :
                    proj.meta === "In progress" ? "text-indigo-500" :
                    "text-stone-400"
                  }`}>
                    {proj.meta}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── SOMETHING I'VE NOTICED ── */}
      {data.noticed && (
        <section className="p-5 rounded-2xl bg-amber-50/40 dark:bg-indigo-900 border border-amber-200/60 dark:border-indigo-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Something I&apos;ve Noticed
            </h2>
          </div>
          <p className="text-sm font-medium text-stone-800 dark:text-parchment-100 mb-1">
            {data.noticed.title}
          </p>
          <p className="text-sm text-stone-600 dark:text-parchment-300 leading-relaxed">
            {data.noticed.description}
          </p>

          {showEvidence && (
            <div className="mt-3 p-3 rounded-lg bg-white dark:bg-indigo-800/40 border border-amber-100 dark:border-indigo-700/30">
              <p className="text-xs text-stone-500 mb-1">{data.noticed.evidence}</p>
              {data.noticed.examples.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {data.noticed.examples.map((ex, i) => (
                    <li key={i} className="text-xs text-stone-500 italic">“{ex}”</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="mt-3 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-parchment-300 transition-colors"
          >
            {showEvidence ? "Hide evidence" : "Why am I seeing this?"}
          </button>
        </section>
      )}

      {/* ── RESEARCH ── */}
      {(data.research.active.length > 0 || data.research.recentCompleted.length > 0) && (
        <section className="p-5 rounded-2xl bg-white dark:bg-indigo-900 border border-parchment-700/20 dark:border-indigo-800/30">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Research
            </h2>
            <Link href="/research" className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {data.research.active.length > 0 && (
            <div className="mb-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-800/30 border border-indigo-100 dark:border-indigo-700/30">
              <div className="flex items-center gap-2 mb-1">
                <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                <p className="text-sm font-medium text-stone-800 dark:text-parchment-100">
                  {data.research.active[0].objective || data.research.active[0].query}
                </p>
              </div>
              <p className="text-xs text-stone-500">
                {data.research.active[0].depth} research · {data.research.active[0].status.toLowerCase()}
              </p>
            </div>
          )}

          {data.research.recentCompleted.slice(0, 2).map((r) => (
            <Link
              key={r.id}
              href="/research"
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-indigo-800/30 transition-colors group"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 dark:text-parchment-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                  {r.objective || r.query}
                </p>
                <p className="text-xs text-stone-500 dark:text-parchment-300">
                  {r._count?.sources || 0} sources · {r.depth} research · Complete
                </p>
                {r.personalInterpretation && (
                  <p className="text-xs text-stone-600 dark:text-parchment-300 mt-1 line-clamp-2">
                    {r.personalInterpretation}
                  </p>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 shrink-0" />
            </Link>
          ))}
        </section>
      )}

      {/* ── RECENT LIFE ── */}
      {data.recentLife.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
            Recent Life
          </h2>
          <div className="relative pl-4 border-l border-stone-200 dark:border-indigo-800 space-y-4">
            {data.recentLife.map((item, i) => (
              <Link
                key={`${item.type}-${item.id}-${i}`}
                href={item.href}
                className="block group relative"
              >
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-parchment-300 dark:bg-indigo-700 border-2 border-white dark:border-indigo-900" />
                <div className="flex items-start gap-3">
                  <LifeIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-400 dark:text-parchment-400">
                      {item.label} · {new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-sm text-stone-700 dark:text-parchment-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                      {item.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Chat CTA ── */}
      <section className="text-center pt-8 pb-4">
        <p className="text-sm text-stone-500 dark:text-parchment-300 mb-3">
          What are you thinking about?
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-parchment-100 text-sm font-medium hover:bg-indigo-600 transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Talk to Lurisa
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-indigo-800 border border-stone-200 dark:border-indigo-700 text-stone-600 dark:text-parchment-300 text-sm hover:bg-stone-50 dark:hover:bg-indigo-700 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            Research something
          </Link>
          <Link
            href="/goals"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-indigo-800 border border-stone-200 dark:border-indigo-700 text-stone-600 dark:text-parchment-300 text-sm hover:bg-stone-50 dark:hover:bg-indigo-700 transition-colors"
          >
            <Target className="w-3.5 h-3.5" />
            Plan something
          </Link>
        </div>
      </section>
    </div>
  );
}
'@

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Cyan
Write-Host "New files:" -ForegroundColor Green
Write-Host "  src/app/api/dashboard/route.ts    (aggregates user, goals, research, timeline, insights)"
Write-Host "  src/components/dashboard/dashboard-home.tsx  (replaced with adaptive command centre)"
Write-Host ""
Write-Host "Test it:" -ForegroundColor Yellow
Write-Host "  npm run dev"
Write-Host "  Go to http://localhost:3000"
Write-Host ""