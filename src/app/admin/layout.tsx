import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { AdminShell } from '@/components/admin/admin-shell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    console.log('No session, redirecting to login');
    redirect('/login');
  }

  console.log('Session user:', session.user.id, session.user.email);
  console.log('ADMIN_EMAILS env:', process.env.ADMIN_EMAILS);

  const admin = await isAdmin(session.user.id);
  console.log('isAdmin result:', admin);

  if (!admin) {
    console.log('Not admin, redirecting to /');
    redirect('/');
  }

  return (
    <AdminShell user={session.user}>
      {children}
    </AdminShell>
  );
}
