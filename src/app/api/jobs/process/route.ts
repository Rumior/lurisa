import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { exportQueue, consolidationQueue, addExportJob } from '@/lib/queue';

// Webhook endpoint for job processing (called by workers)
export async function POST(req: NextRequest) {
  try {
    // Verify worker auth
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.WORKER_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = await req.json();

    switch (type) {
      case 'export':
        await addExportJob(data);
        break;
      case 'consolidation':
        await consolidationQueue.add('consolidate', data);
        break;
      default:
        return NextResponse.json({ error: 'Unknown job type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Job process error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
