'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, MessageSquare, Target, Clock, Sparkles, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  memoryCount: number;
  conversationCount: number;
  goalCount: number;
  pendingConfirmations: number;
  recentMemories: any[];
}

export function DashboardHome() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setStats({
          memoryCount: data.user._count.memories,
          conversationCount: data.user._count.conversations,
          goalCount: data.user._count.goals,
          pendingConfirmations: 0,
          recentMemories: [],
        });
      }
    } catch (error) { console.error('Failed to fetch stats:', error); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300 mb-2">Good to see you</h1>
        <p className="text-charcoal-500 dark:text-parchment-300">Here&apos;s what lurisa remembers about your journey so far.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Brain className="h-5 w-5 text-sage-500" />} label="Memories" value={loading ? null : stats?.memoryCount ?? 0} href="/memories" />
        <StatCard icon={<MessageSquare className="h-5 w-5 text-indigo-500" />} label="Conversations" value={loading ? null : stats?.conversationCount ?? 0} href="/chat" />
        <StatCard icon={<Target className="h-5 w-5 text-amber-500" />} label="Goals" value={loading ? null : stats?.goalCount ?? 0} href="/goals" />
      </div>

      {stats && stats.pendingConfirmations > 0 && (
        <Card className="border-amber-500/30 bg-amber-50 dark:bg-amber-900/10">
          <CardContent className="p-4 flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-charcoal-700 dark:text-parchment-100">{stats.pendingConfirmations} memory{stats.pendingConfirmations > 1 ? 'ies' : 'y'} need your attention</p>
              <p className="text-xs text-charcoal-500">lurisa found something that conflicts with what it knows</p>
            </div>
            <Link href="/memories" className="ml-auto"><Button size="sm" variant="outline">Review</Button></Link>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-parchment-700/30">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg font-serif text-indigo-500 dark:text-indigo-300">Start a conversation</CardTitle>
            </div>
            <CardDescription>Share what&apos;s on your mind. lurisa listens and remembers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/chat"><Button className="w-full">Open Chat <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </CardContent>
        </Card>

        <Card className="border-parchment-700/30">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-terracotta-500" />
              <CardTitle className="text-lg font-serif text-indigo-500 dark:text-indigo-300">Evening reflection</CardTitle>
            </div>
            <CardDescription>Take a moment to reflect on today. What did you learn?</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/chat?mode=evening"><Button variant="outline" className="w-full">Reflect <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-serif text-indigo-500 dark:text-indigo-300 mb-4">Memory categories</h2>
        <div className="flex flex-wrap gap-2">
          {['Identity', 'Relationships', 'Goals', 'Career', 'Health', 'Lessons', 'Stories', 'Dreams'].map((cat) => (
            <Badge key={cat} variant="outline">{cat}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number | null; href: string }) {
  return (
    <Link href={href}>
      <Card className="border-parchment-700/30 hover:journal-shadow-lg transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-charcoal-500 dark:text-parchment-300">{label}</p>
              {value === null ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-serif text-indigo-500 dark:text-indigo-300">{value}</p>}
            </div>
            <div className="h-10 w-10 rounded-lg bg-parchment-500/50 flex items-center justify-center">{icon}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
