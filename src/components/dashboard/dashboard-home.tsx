"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Sun, Moon, Sunrise, Target, BookOpen, MessageCircle, ChevronRight,
  Search, ArrowRight, TrendingUp, Globe, Quote, Zap, Lightbulb,
  Calendar, Flag,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalUpdatesCard } from "@/components/dashboard/global-updates-card";

interface DashboardData {
  user: { id: string; name?: string | null; email: string };
  greeting: string;
  userName: string;
  subtitle: string;
  priorities: Array<{
    type: string; id: string; title: string; subtitle: string;
    href: string; urgency: string; dueText: string;
  }>;
  noticed: { title: string; description: string; evidence: string; confidence: number; examples: string[] } | null;
  research: { active: any[]; recentCompleted: any[] };
  goals: { active: any[] };
  projects: Array<{ type: string; id: string; title: string; subtitle: string; meta: string; href: string }>;
  recentLife: Array<{ id: string; date: string; label: string; description: string; type: string; href: string }>;
}

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Do not wait to strike till the iron is hot, but make it hot by striking.", author: "William Butler Yeats" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "It always seems impossible until it is done.", author: "Nelson Mandela" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "You do not have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "An ounce of action is worth a ton of theory.", author: "Ralph Waldo Emerson" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
];

function getTodaysQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
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
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${cls}`}>{label}</span>;
}

function TypeIcon({ type }: { type: string }) {
  if (type === "goal") return <Target className="w-4 h-4 text-sage-500" />;
  if (type === "research") return <BookOpen className="w-4 h-4 text-indigo-500" />;
  return <div className="w-4 h-4 rounded-full border-2 border-charcoal-300" />;
}

function GoalProgress({ daysUntil }: { daysUntil: number | null }) {
  if (daysUntil === null) {
    return <div className="w-full h-1.5 bg-parchment-500 dark:bg-indigo-800 rounded-full overflow-hidden"><div className="h-full bg-sage-500 rounded-full w-1/3 animate-pulse" /></div>;
  }
  const width = Math.max(5, Math.min(100, 100 - Math.max(0, daysUntil) * 6));
  return <div className="w-full h-1.5 bg-parchment-500 dark:bg-indigo-800 rounded-full overflow-hidden"><div className="h-full bg-sage-500 rounded-full transition-all duration-700" style={{ width: `${width}%` }} /></div>;
}

function DashboardSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-fade-in">
      <div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-64"><CardHeader><Skeleton className="h-4 w-32" /></CardHeader><CardContent className="space-y-3"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /><Skeleton className="h-3 w-4/6" /></CardContent></Card>
        ))}
      </div>
      <Card className="h-32"><CardContent className="pt-6"><Skeleton className="h-4 w-3/4 mx-auto" /><Skeleton className="h-3 w-32 mx-auto mt-3" /></CardContent></Card>
    </div>
  );
}

export function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const todaysQuote = useMemo(() => getTodaysQuote(), []);

  useEffect(() => { fetchDashboard(); }, []);
  async function fetchDashboard() {
    try { const res = await fetch("/api/dashboard"); if (res.ok) { const json = await res.json(); setData(json); } } catch (err) { console.error("Dashboard fetch error:", err); } finally { setLoading(false); }
  }

  const hour = new Date().getHours();
  if (loading) return <DashboardSkeleton />;
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-full bg-parchment-500 dark:bg-indigo-800 flex items-center justify-center mb-4"><Zap className="w-5 h-5 text-charcoal-300 dark:text-parchment-300" /></div>
        <p className="text-charcoal-500 dark:text-parchment-300 font-medium">Could not load your dashboard.</p>
        <p className="text-sm text-charcoal-300 dark:text-parchment-400 mt-1">Something went wrong fetching your overview.</p>
        <Button onClick={fetchDashboard} variant="outline" className="mt-4">Try again</Button>
      </div>
    );
  }

  const urgentCount = data.priorities.filter(p => p.urgency === "critical" || p.urgency === "high" || p.urgency === "overdue").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-fade-in">
      <header className="space-y-1 pt-2">
        <div className="flex items-center gap-3"><TimeIcon hour={hour} /><h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300 tracking-tight">{data.greeting}, {data.userName}.</h1></div>
        <p className="text-sm text-charcoal-500 dark:text-parchment-300 pl-8 leading-relaxed">{data.subtitle}</p>
        <p className="text-xs text-charcoal-300 dark:text-charcoal-300 pl-8 font-medium tracking-wide uppercase">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Your Priority */}
        <Card className="border-parchment-700/20 dark:border-indigo-800/30 journal-shadow flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-charcoal-300 dark:text-parchment-300 uppercase tracking-widest">Your Priority</CardTitle>
              {data.priorities.length > 0 && <span className="text-[11px] font-medium text-charcoal-300 dark:text-parchment-400 bg-parchment-500/40 dark:bg-indigo-800/40 px-2 py-0.5 rounded-full">{urgentCount > 0 ? `${urgentCount} urgent` : `${data.priorities.length} items`}</span>}
            </div>
            <CardDescription className="text-xs text-charcoal-300 dark:text-parchment-400 mt-1">{data.priorities.length > 0 ? `${data.priorities.length} thing${data.priorities.length > 1 ? "s" : ""} need${data.priorities.length === 1 ? "s" : ""} attention` : "Nothing urgent right now"}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {data.priorities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6"><Calendar className="w-8 h-8 text-parchment-700 dark:text-indigo-700 mb-2" /><p className="text-sm text-charcoal-300 dark:text-parchment-400">No urgent priorities.</p><p className="text-xs text-charcoal-300/70 dark:text-parchment-400/70 mt-0.5">Everything is calm.</p></div>
            ) : (
              <div className="space-y-2.5">
                {data.priorities.slice(0, 4).map((p) => (
                  <Link key={`${p.type}-${p.id}`} href={p.href} className="flex items-start gap-3 p-2.5 rounded-xl bg-parchment-100 dark:bg-indigo-800/30 border border-transparent hover:border-indigo-300/40 dark:hover:border-indigo-600/40 transition-all group">
                    <div className="mt-0.5 shrink-0"><TypeIcon type={p.type} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-medium text-charcoal-700 dark:text-parchment-100 truncate">{p.title}</p><UrgencyBadge urgency={p.urgency} /></div>
                      <p className="text-xs text-charcoal-300 dark:text-parchment-400 mt-0.5 truncate">{p.dueText}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-parchment-700 group-hover:text-indigo-500 shrink-0 mt-1 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0 pb-5">
            <Link href="/goals" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200 transition-colors group">View priorities<ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></Link>
          </CardFooter>
        </Card>

        {/* Card 2: Active Projects */}
        <Card className="border-parchment-700/20 dark:border-indigo-800/30 journal-shadow flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-charcoal-300 dark:text-parchment-300 uppercase tracking-widest">Active Projects</CardTitle>
              {data.projects.length > 0 && <span className="text-[11px] font-medium text-charcoal-300 dark:text-parchment-400 bg-parchment-500/40 dark:bg-indigo-800/40 px-2 py-0.5 rounded-full">{data.projects.length} in progress</span>}
            </div>
            <CardDescription className="text-xs text-charcoal-300 dark:text-parchment-400 mt-1">{data.projects.length > 0 ? "What you are currently working on" : "Start your first project"}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {data.projects.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6"><Flag className="w-8 h-8 text-parchment-700 dark:text-indigo-700 mb-2" /><p className="text-sm text-charcoal-300 dark:text-parchment-400">No active projects yet.</p><p className="text-xs text-charcoal-300/70 dark:text-parchment-400/70 mt-0.5">Create a goal to get started.</p></div>
            ) : (
              <div className="space-y-2">
                {data.projects.slice(0, 4).map((proj) => (
                  <Link key={`${proj.type}-${proj.id}`} href={proj.href} className="flex items-center justify-between p-3 rounded-xl bg-parchment-100 dark:bg-indigo-800/30 hover:bg-parchment-500/30 dark:hover:bg-indigo-800/50 transition-colors group">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal-700 dark:text-parchment-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{proj.title}</p>
                      <p className="text-xs text-charcoal-300 dark:text-parchment-400 truncate">{proj.subtitle}</p>
                    </div>
                    <span className={`text-[11px] font-semibold shrink-0 ml-3 px-2 py-0.5 rounded-full ${proj.meta === "Complete" ? "bg-sage-500/10 text-sage-600 dark:text-sage-300" : proj.meta === "Overdue" ? "bg-terracotta-500/10 text-terracotta-500" : proj.meta === "In progress" ? "bg-indigo-500/10 text-indigo-500" : "bg-parchment-500/40 text-charcoal-300 dark:text-parchment-400"}`}>{proj.meta}</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0 pb-5">
            <Link href="/goals" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200 transition-colors group">View projects<ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></Link>
          </CardFooter>
        </Card>

        {/* Card 3: Goals */}
        <Card className="border-parchment-700/20 dark:border-indigo-800/30 journal-shadow flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-charcoal-300 dark:text-parchment-300 uppercase tracking-widest">Goals</CardTitle>
              {data.goals.active.length > 0 && <span className="text-[11px] font-medium text-charcoal-300 dark:text-parchment-400 bg-parchment-500/40 dark:bg-indigo-800/40 px-2 py-0.5 rounded-full">{data.goals.active.length} active</span>}
            </div>
            <CardDescription className="text-xs text-charcoal-300 dark:text-parchment-400 mt-1">{data.goals.active.length > 0 ? "Long-term progress" : "Set a goal to track your growth"}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {data.goals.active.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-6"><TrendingUp className="w-8 h-8 text-parchment-700 dark:text-indigo-700 mb-2" /><p className="text-sm text-charcoal-300 dark:text-parchment-400">No active goals yet.</p><p className="text-xs text-charcoal-300/70 dark:text-parchment-400/70 mt-0.5">What are you working toward?</p></div>
            ) : (
              <div className="space-y-4">
                {data.goals.active.slice(0, 4).map((g: any) => (
                  <Link key={g.id} href="/goals" className="block group">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-charcoal-700 dark:text-parchment-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors truncate pr-3">{g.title}</p>
                      {g.daysUntil !== null && <span className={`text-[11px] font-medium shrink-0 ${g.daysUntil < 0 ? "text-terracotta-500" : g.daysUntil <= 3 ? "text-amber-600 dark:text-amber-400" : "text-charcoal-300 dark:text-parchment-400"}`}>{g.daysUntil < 0 ? "Overdue" : g.daysUntil === 0 ? "Today" : `${g.daysUntil}d left`}</span>}
                    </div>
                    <GoalProgress daysUntil={g.daysUntil} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0 pb-5">
            <Link href="/goals" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200 transition-colors group">View goals<ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></Link>
          </CardFooter>
        </Card>

        {/* Card 4: Global Updates */}
        <GlobalUpdatesCard />
      </div>

      {/* Card 5: Daily Thought */}
      <Card className="border-terracotta-300/30 dark:border-terracotta-700/30 journal-shadow bg-terracotta-100/30 dark:bg-terracotta-900/10">
        <CardContent className="pt-8 pb-8 px-8 text-center">
          <Quote className="w-5 h-5 text-terracotta-500/60 mx-auto mb-4" />
          <blockquote className="text-lg font-serif text-charcoal-700 dark:text-parchment-100 leading-relaxed max-w-2xl mx-auto">&ldquo;{todaysQuote.text}&rdquo;</blockquote>
          <p className="text-sm text-terracotta-600 dark:text-terracotta-300 mt-3 font-medium">â€” {todaysQuote.author}</p>
        </CardContent>
      </Card>

      {/* Conversation Area */}
      <section className="pt-4 pb-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-parchment-700/20 dark:border-indigo-800/30" /></div>
          <div className="relative flex justify-center"><span className="bg-parchment-300 dark:bg-parchment-900 px-4 text-xs text-charcoal-300 dark:text-parchment-400 uppercase tracking-widest font-medium">What are you thinking about?</span></div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/chat"><Button size="lg" className="rounded-xl px-6 shadow-sm journal-shadow"><MessageCircle className="w-4 h-4 mr-2" />Talk to Lurisa</Button></Link>
          <Link href="/chat"><Button variant="outline" size="lg" className="rounded-xl px-5"><Search className="w-3.5 h-3.5 mr-2" />Research something</Button></Link>
          <Link href="/goals"><Button variant="outline" size="lg" className="rounded-xl px-5"><Target className="w-3.5 h-3.5 mr-2" />Plan something</Button></Link>
        </div>
      </section>
    </div>
  );
}
