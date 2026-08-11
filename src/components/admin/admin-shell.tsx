'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  Activity, 
  LogOut,
  ArrowLeft
} from 'lucide-react';

interface AdminShellProps {
  user: { id: string; email: string; name?: string | null };
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Audit Logs', href: '/admin/audit', icon: Shield },
  { name: 'Health', href: '/admin/health', icon: Activity },
];

export function AdminShell({ user, children }: AdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-parchment-300 dark:bg-parchment-900">
      {/* Admin Header */}
      <header className="bg-indigo-500 text-parchment-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80">
                <ArrowLeft size={18} />
                <span className="text-sm">Back to App</span>
              </Link>
              <div className="h-4 w-px bg-parchment-100/30" />
              <span className="font-serif text-lg">Admin</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm opacity-80">{user.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm hover:opacity-80 flex items-center space-x-1"
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sub Navigation */}
      <nav className="bg-parchment-100 dark:bg-indigo-900 border-b border-parchment-700/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 -mb-px">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
                    ${isActive
                      ? 'border-amber-500 text-indigo-500 dark:text-indigo-300'
                      : 'border-transparent text-charcoal-500 hover:text-charcoal-700 hover:border-parchment-700 dark:text-parchment-300'
                    }
                  `}
                >
                  <item.icon size={16} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
