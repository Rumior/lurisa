'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Brain, MessageSquare, Target, TrendingUp, Clock } from 'lucide-react';

interface SystemStats {
  stats: {
    totalUsers: number;
    totalMemories: number;
    totalConversations: number;
    totalGoals: number;
    activeToday: number;
    recentSignups: number;
  };
  health: {
    overall: boolean;
    database: { healthy: boolean; latency: number };
    redis: { healthy: boolean; latency: number };
    queues: { healthy: boolean; queues: Record<string, number> };
  };
}

export function AdminDashboard() {
  const [data, setData] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const stats = await res.json();
        setData(stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: 'Total Users', value: data?.stats.totalUsers, icon: Users, color: 'text-indigo-500' },
    { label: 'Total Memories', value: data?.stats.totalMemories, icon: Brain, color: 'text-sage-500' },
    { label: 'Conversations', value: data?.stats.totalConversations, icon: MessageSquare, color: 'text-amber-500' },
    { label: 'Active Goals', value: data?.stats.totalGoals, icon: Target, color: 'text-terracotta-500' },
    { label: 'Active Today', value: data?.stats.activeToday, icon: Clock, color: 'text-indigo-500' },
    { label: 'New This Week', value: data?.stats.recentSignups, icon: TrendingUp, color: 'text-sage-500' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300">System Overview</h1>
        <p className="text-charcoal-500 dark:text-parchment-300 mt-1">Real-time system health and statistics</p>
      </div>

      {/* Health Status */}
      <div className="flex items-center space-x-4">
        <div className={`h-3 w-3 rounded-full ${data?.health.overall ? 'bg-sage-500' : 'bg-error'} animate-pulse`} />
        <span className="text-sm font-medium text-charcoal-700 dark:text-parchment-100">
          System {data?.health.overall ? 'Healthy' : 'Degraded'}
        </span>
        {data && (
          <>
            <span className="text-xs text-charcoal-300">
              DB: {data.health.database.latency}ms
            </span>
            <span className="text-xs text-charcoal-300">
              Redis: {data.health.redis.latency}ms
            </span>
          </>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className="border-parchment-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-charcoal-500 dark:text-parchment-300">{card.label}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className={`text-2xl font-serif ${card.color}`}>
                      {card.value?.toLocaleString() || 0}
                    </p>
                  )}
                </div>
                <card.icon className={`h-8 w-8 opacity-20 ${card.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Queue Status */}
      <Card className="border-parchment-700/30">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-indigo-500 dark:text-indigo-300">Queue Status</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(data?.health.queues.queues || {}).map(([name, count]) => (
                <div key={name} className="text-center p-4 bg-parchment-500/30 rounded-lg">
                  <p className="text-2xl font-serif text-indigo-500">{count}</p>
                  <p className="text-xs text-charcoal-500 capitalize">{name} pending</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
