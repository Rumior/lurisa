'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  memoryPaused: boolean;
  _count: {
    memories: number;
    conversations: number;
    goals: number;
  };
}

export function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, [page]);

  async function fetchUsers() {
    try {
      const res = await fetch(`/api/admin/users?page=${page}&pageSize=50`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-indigo-500 dark:text-indigo-300">Users</h1>
          <p className="text-charcoal-500 dark:text-parchment-300 mt-1">Manage user accounts and data</p>
        </div>
      </div>

      <Card className="border-parchment-700/30">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-parchment-500/30 border-b border-parchment-700/20">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-charcoal-500">User</th>
                  <th className="text-left px-4 py-3 font-medium text-charcoal-500">Joined</th>
                  <th className="text-center px-4 py-3 font-medium text-charcoal-500">Memories</th>
                  <th className="text-center px-4 py-3 font-medium text-charcoal-500">Conversations</th>
                  <th className="text-center px-4 py-3 font-medium text-charcoal-500">Goals</th>
                  <th className="text-left px-4 py-3 font-medium text-charcoal-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-parchment-700/10">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-8 mx-auto" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-charcoal-500">
                      <Users className="mx-auto h-8 w-8 mb-2 opacity-30" />
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-parchment-500/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-charcoal-700 dark:text-parchment-100">{user.name || 'Unnamed'}</p>
                          <p className="text-xs text-charcoal-300">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-charcoal-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center text-charcoal-700 dark:text-parchment-100">
                        {user._count.memories}
                      </td>
                      <td className="px-4 py-3 text-center text-charcoal-700 dark:text-parchment-100">
                        {user._count.conversations}
                      </td>
                      <td className="px-4 py-3 text-center text-charcoal-700 dark:text-parchment-100">
                        {user._count.goals}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.memoryPaused ? 'muted' : 'secondary'} className="text-xs">
                          {user.memoryPaused ? 'Paused' : 'Active'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-parchment-700/20">
            <p className="text-sm text-charcoal-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
