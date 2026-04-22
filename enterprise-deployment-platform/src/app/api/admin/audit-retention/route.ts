import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/log/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Retention cron: deletes audit log rows older than the retention window. Runs
// nightly via the Vercel cron declared in `vercel.json`. Vercel signs cron
// requests with CRON_SECRET — reject anything without the bearer token.
const RETENTION_DAYS = 90;

export async function GET(req: NextRequest): Promise<Response> {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  logger.info({ deleted: count, cutoff: cutoff.toISOString() }, 'audit-retention sweep');
  return NextResponse.json({ ok: true, deleted: count, cutoff });
}
