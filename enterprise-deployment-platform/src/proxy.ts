import { NextResponse, type NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/tokens';
import { ACCESS_COOKIE } from '@/lib/auth/cookies';
import { authLimiter, globalLimiter, writeLimiter } from '@/lib/rate-limit';

const PROTECTED_PAGE_PREFIXES = ['/dashboard', '/library', '/account', '/playlists', '/admin'];
const PROTECTED_API_PREFIXES = [
  '/api/me',
  '/api/playlists',
  '/api/admin',
  '/api/playback',
  '/api/subscriptions',
  '/api/tracks', // like/unlike mutations
  '/api/artists', // follow/unfollow mutations
];
const AUTH_LIMITED_API = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
const PUBLIC_API_PATTERNS: RegExp[] = [
  /^\/api\/artists(\/[^/]+)?$/, // GET artist(s)
  /^\/api\/albums\/[^/]+$/,
  /^\/api\/tracks\/[^/]+$/,
  /^\/api\/categories$/,
  /^\/api\/search$/,
  /^\/api\/webhooks\/billing$/,
  /^\/api\/health$/,
  // Vercel cron endpoints handle their own bearer-token auth via CRON_SECRET.
  /^\/api\/admin\/audit-retention$/,
  // Sentry tunnel route — Sentry SDK authenticates via DSN embedded in the envelope.
  /^\/monitoring$/,
];

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() ?? 'unknown';
  return req.headers.get('x-real-ip') ?? 'unknown';
}

function isPublicApi(path: string, method: string): boolean {
  if (method !== 'GET' && method !== 'POST') return false;
  if (method === 'POST' && path !== '/api/webhooks/billing') return false;
  return PUBLIC_API_PATTERNS.some((pat) => pat.test(path));
}

function needsApiAuth(path: string, method: string): boolean {
  if (path.startsWith('/api/auth')) return path === '/api/auth/me' || path === '/api/auth/logout';
  if (isPublicApi(path, method)) return false;
  return PROTECTED_API_PREFIXES.some((p) => path.startsWith(p));
}

function needsPageAuth(path: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

function jsonUnauthorized(message: string, requestId: string): NextResponse {
  return new NextResponse(JSON.stringify({ ok: false, error: { message, code: 'UNAUTHORIZED' } }), {
    status: 401,
    headers: { 'content-type': 'application/json', 'x-request-id': requestId },
  });
}

function jsonRateLimited(retryAfter: number, requestId: string): NextResponse {
  return new NextResponse(
    JSON.stringify({ ok: false, error: { message: 'Too many requests', code: 'RATE_LIMITED' } }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'retry-after': String(retryAfter),
        'x-request-id': requestId,
      },
    },
  );
}

function newRequestId(): string {
  // Edge-runtime-friendly — crypto.randomUUID is available in both Node and Edge.
  return crypto.randomUUID();
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ip = getClientIp(req);
  const requestId = req.headers.get('x-request-id') ?? newRequestId();

  // ── Rate limiting ─────────────────────────────────────────────────────────
  if (pathname.startsWith('/api')) {
    const global = await globalLimiter.consume(`ip:${ip}`);
    if (!global.allowed) return jsonRateLimited(global.retryAfterSec, requestId);

    if (AUTH_LIMITED_API.some((p) => pathname.startsWith(p))) {
      const auth = await authLimiter.consume(`auth:${ip}`);
      if (!auth.allowed) return jsonRateLimited(auth.retryAfterSec, requestId);
    }

    // Write bucket: any mutation on /api/* (except webhooks which carry their own HMAC)
    const isWrite =
      req.method === 'POST' ||
      req.method === 'PUT' ||
      req.method === 'PATCH' ||
      req.method === 'DELETE';
    if (isWrite && !pathname.startsWith('/api/webhooks/')) {
      const write = await writeLimiter.consume(`write:${ip}`);
      if (!write.allowed) return jsonRateLimited(write.retryAfterSec, requestId);
    }
  }

  // ── API auth ──────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api') && needsApiAuth(pathname, req.method)) {
    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    if (!token) return jsonUnauthorized('Missing access token', requestId);
    const claims = await verifyAccessToken(token);
    if (!claims) return jsonUnauthorized('Invalid or expired access token', requestId);

    const res = NextResponse.next();
    res.headers.set('x-user-id', claims.sub);
    res.headers.set('x-user-role', claims.role);
    res.headers.set('x-request-id', requestId);
    return res;
  }

  // ── Page auth ─────────────────────────────────────────────────────────────
  if (needsPageAuth(pathname)) {
    const token = req.cookies.get(ACCESS_COOKIE)?.value;
    const claims = token ? await verifyAccessToken(token) : null;
    if (!claims) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (pathname.startsWith('/admin') && claims.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  const res = NextResponse.next();
  res.headers.set('x-request-id', requestId);
  return res;
}

export const config = {
  matcher: [
    // Run on everything except Next internals + static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)',
  ],
};
