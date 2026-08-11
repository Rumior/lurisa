'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { MessageCircle, Brain, Target, Clock, Settings, LogOut, Menu, X, Moon, Sun, Bell } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';

interface DashboardShellProps {
  user: { id: string; email: string; name?: string | null; image?: string | null };
  children: React.ReactNode;
}

const navigation = [
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Memories', href: '/memories', icon: Brain },
  { name: 'Goals', href: '/goals', icon: Target },
  { name: 'Timeline', href: '/timeline', icon: Clock },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    fetch('/api/notifications/unread')
      .then(r => r.ok ? r.json() : { count: 0 })
      .then(data => setUnreadCount(data.count || 0))
      .catch(() => setUnreadCount(0));
  }, []);

  return (
    <div className="min-h-screen bg-parchment-300 dark:bg-parchment-900">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-charcoal-900/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-parchment-100 dark:bg-indigo-900 border-r border-parchment-700/30 dark:border-parchment-700/10 transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-parchment-700/20 dark:border-indigo-800/30">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center">
                <span className="text-parchment-100 font-serif text-lg">l</span>
              </div>
              <span className="text-xl font-serif text-indigo-500 dark:text-indigo-300">lurisa</span>
            </Link>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-charcoal-500">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const isNotifications = item.name === 'Notifications';
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-500 text-parchment-100' : 'text-charcoal-500 hover:bg-parchment-500 hover:text-charcoal-700 dark:text-parchment-300 dark:hover:bg-indigo-800'}`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon size={18} />
                    <span>{item.name}</span>
                  </div>
                  {isNotifications && unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-terracotta-500 text-parchment-100 text-xs font-bold">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-parchment-700/20 dark:border-indigo-800/30 space-y-3">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-charcoal-500 hover:bg-parchment-500 w-full transition-colors dark:text-parchment-300 dark:hover:bg-indigo-800"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>

            <div className="flex items-center space-x-3 px-3 py-2">
              <Avatar src={user.image} fallback={user.name || user.email} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-charcoal-700 dark:text-parchment-100 truncate">{user.name || 'User'}</p>
                <p className="text-xs text-charcoal-300 dark:text-charcoal-100 truncate">{user.email}</p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-charcoal-500 hover:bg-error/10 hover:text-error dark:text-parchment-300 w-full transition-colors"
            >
              <LogOut size={18} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:ml-64">
        <header className="fixed top-0 left-0 right-0 z-30 lg:hidden h-16 flex items-center justify-between px-4 border-b border-parchment-700/20 dark:border-indigo-800/30 bg-parchment-100 dark:bg-indigo-900">
          <button onClick={() => setSidebarOpen(true)} className="text-charcoal-500 dark:text-parchment-300">
            <Menu size={24} />
          </button>
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-full bg-indigo-500 flex items-center justify-center">
              <span className="text-parchment-100 font-serif text-sm">l</span>
            </div>
            <span className="font-serif text-indigo-500 dark:text-indigo-300">lurisa</span>
          </div>
          <div className="w-8" />
        </header>

        <main className="pt-20 lg:pt-0 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

