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

    // â”€â”€ Compute greeting â”€â”€
    const hour = now.getHours();
    let greeting = "Good evening";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";
    const userName = user.name?.split(" ")[0] || "there";

    // â”€â”€ Compute "Today" priorities â”€â”€
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
        subtitle: `${r.depth.toLowerCase()} research Â· ${r.status.toLowerCase()}`,
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

    // â”€â”€ Compute subtitle â”€â”€
    const urgentCount = priorities.filter((p) => p.urgency === "critical" || p.urgency === "high" || p.urgency === "overdue").length;
    let subtitle = "Here's what matters right now.";
    if (urgentCount === 1) subtitle = "You have 1 important thing today.";
    else if (urgentCount > 1) subtitle = `You have ${urgentCount} important things today.`;
    else if (priorities.length > 0) subtitle = `You have ${priorities.length} thing${priorities.length > 1 ? "s" : ""} to focus on.`;
    else if (activeResearch.length > 0) subtitle = "Your research is in progress.";
    else subtitle = "Everything is calm. What would you like to work on?";

    // â”€â”€ Compute "Something I've Noticed" â”€â”€
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

    // â”€â”€ Recent Life â”€â”€
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

    // â”€â”€ Active "projects" (goals + research) â”€â”€
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