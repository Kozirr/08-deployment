import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Smoke-probe endpoint used by the production deploy workflow and any uptime
// monitor. Pings the DB so cold DBs are caught, returns 503 if the DB is down.
export async function GET(): Promise<Response> {
  const startedAt = Date.now();
  let dbOk = false;
  let dbError: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const body = {
    ok: dbOk,
    db: dbOk ? 'up' : 'down',
    ...(dbError ? { dbError } : {}),
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    region: process.env.VERCEL_REGION ?? null,
    timestamp: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
  };

  return NextResponse.json(body, { status: dbOk ? 200 : 503 });
}
