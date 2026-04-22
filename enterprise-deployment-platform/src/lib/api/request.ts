import type { NextRequest } from 'next/server';

export function getClientIp(req: NextRequest): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() ?? null;
  return req.headers.get('x-real-ip') ?? null;
}

export function getUserAgent(req: NextRequest): string | null {
  return req.headers.get('user-agent');
}

export type Pagination = { skip: number; take: number; page: number; pageSize: number };

export function parsePagination(req: NextRequest, defaults = { pageSize: 20 }): Pagination {
  const url = new URL(req.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
  const pageSizeRaw = Number.parseInt(
    url.searchParams.get('pageSize') ?? String(defaults.pageSize),
    10,
  );
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw || defaults.pageSize));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}
