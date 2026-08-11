import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { DashboardHome } from '@/components/dashboard/dashboard-home';

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/login');
  }
  
  return <DashboardHome />;
}
