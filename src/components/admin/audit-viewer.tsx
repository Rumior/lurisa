'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resource: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { email: string; name: string | null } | null;
}

export function AuditViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs();
  }, [page]);

  async function fetchLogs() {
    try {
      const res = await fetch(`/api/admin/audit?page=${page}&pageSize=100`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  const getActionColor = (action: string): string => {
    if (action.includes('delete')) return 'bg-error/10 text-error';
    if (action.includes('login')) return 'bg-sage-100 text-sage-700';
    if (action.includes('export')) return 'bg-amber-100 text-amber-700';
    if (action.includes('failed')) return 'bg-error/10 text-error';
    return 'bg-parchment-500 text-charcoal-500';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300">Audit Logs</h1>
        <p className="text-charcoal-500 dark:text-parchment-300 mt-1">Security and compliance event log</p>
      </div>

      <Card className="border-parchment-700/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-parchment-500/30 border-b border-parchment-700/20">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-charcoal-500">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-charcoal-500">User</th>
                  <th className="text-left px-4 py-3 font-medium text-charcoal-500">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-charcoal-500">Resource</th>
                  <th className="text-left px-4 py-3 font-medium text-charcoal-500">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-parchment-700/10">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-charcoal-500">
                      <Shield className="mx-auto h-8 w-8 mb-2 opacity-30" />
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-parchment-500/20 transition-colors">
                      <td className="px-4 py-3 text-charcoal-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-charcoal-700 dark:text-parchment-100">
                          {log.user?.name || log.user?.email || 'System'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-charcoal-500 text-xs">
                        {log.resource || '-'}
                      </td>
                      <td className="px-4 py-3 text-charcoal-300 text-xs font-mono">
                        {log.ipAddress || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-parchment-700/20">
            <p className="text-sm text-charcoal-500">Page {page} of {totalPages}</p>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft size={16} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
