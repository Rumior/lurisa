'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Database, Server, Layers } from 'lucide-react';

interface HealthData {
  status: string;
  services: {
    database: { healthy: boolean; latency: number; connections?: number };
    redis: { healthy: boolean; latency: number };
    queues: { healthy: boolean; queues: Record<string, number> };
  };
  timestamp: string;
}

export function HealthMonitor() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [history, setHistory] = useState<{ time: string; db: number; redis: number }[]>([]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchHealth() {
    try {
      const res = await fetch('/api/admin/health');
      const data = await res.json();
      setHealth(data);

      setHistory(prev => [
        ...prev.slice(-29),
        {
          time: new Date().toLocaleTimeString(),
          db: data.services.database.latency,
          redis: data.services.redis.latency,
        },
      ]);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  const ServiceCard = ({ 
    title, 
    icon: Icon, 
    healthy, 
    latency, 
    extra 
  }: { 
    title: string; 
    icon: any; 
    healthy: boolean; 
    latency: number;
    extra?: React.ReactNode;
  }) => (
    <Card className="border-parchment-700/30">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-charcoal-300" />
            <span className="font-medium text-charcoal-700 dark:text-parchment-100">{title}</span>
          </div>
          <Badge variant={healthy ? 'secondary' : 'default'} className={healthy ? 'bg-sage-100 text-sage-700' : 'bg-error/10 text-error'}>
            {healthy ? 'Healthy' : 'Unhealthy'}
          </Badge>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-serif text-indigo-500">{latency}ms</p>
          <p className="text-xs text-charcoal-300">Response latency</p>
        </div>
        {extra && <div className="mt-4 pt-4 border-t border-parchment-700/20">{extra}</div>}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300">System Health</h1>
        <p className="text-charcoal-500 dark:text-parchment-300 mt-1">Real-time service monitoring</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <ServiceCard
          title="Database"
          icon={Database}
          healthy={health?.services.database.healthy ?? false}
          latency={health?.services.database.latency ?? 0}
          extra={
            <p className="text-xs text-charcoal-500">
              Active connections: {health?.services.database.connections || 0}
            </p>
          }
        />
        <ServiceCard
          title="Redis"
          icon={Server}
          healthy={health?.services.redis.healthy ?? false}
          latency={health?.services.redis.latency ?? 0}
        />
        <ServiceCard
          title="Job Queues"
          icon={Layers}
          healthy={health?.services.queues.healthy ?? false}
          latency={0}
          extra={
            <div className="space-y-1">
              {Object.entries(health?.services.queues.queues || {}).map(([name, count]) => (
                <div key={name} className="flex justify-between text-xs">
                  <span className="text-charcoal-500 capitalize">{name}</span>
                  <span className="text-charcoal-700 dark:text-parchment-100 font-medium">{count} pending</span>
                </div>
              ))}
            </div>
          }
        />
      </div>

      {/* Latency History */}
      <Card className="border-parchment-700/30">
        <CardHeader>
          <CardTitle className="text-lg font-serif text-indigo-500 dark:text-indigo-300 flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            Latency History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="h-48 flex items-end space-x-1">
              {history.map((point, i) => {
                const maxLatency = Math.max(...history.map(h => Math.max(h.db, h.redis)), 100);
                const dbHeight = (point.db / maxLatency) * 100;
                const redisHeight = (point.redis / maxLatency) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col justify-end space-y-0.5">
                    <div 
                      className="bg-indigo-500/60 rounded-sm" 
                      style={{ height: `${Math.max(dbHeight, 4)}%` }}
                      title={`DB: ${point.db}ms`}
                    />
                    <div 
                      className="bg-sage-500/60 rounded-sm" 
                      style={{ height: `${Math.max(redisHeight, 4)}%` }}
                      title={`Redis: ${point.redis}ms`}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-charcoal-300">
              Collecting data...
            </div>
          )}
          <div className="flex items-center justify-center space-x-6 mt-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="h-3 w-3 bg-indigo-500/60 rounded" />
              <span className="text-charcoal-500">Database</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-3 w-3 bg-sage-500/60 rounded" />
              <span className="text-charcoal-500">Redis</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
