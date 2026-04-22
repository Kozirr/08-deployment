import type { NextResponse } from 'next/server';
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from './tokens';

export const ACCESS_COOKIE = 'sp_at';
export const REFRESH_COOKIE = 'sp_rt';

type CookieOpts = {
  secure: boolean;
  domain?: string;
};

function cookieBaseOpts(): CookieOpts {
  const domain = process.env.COOKIE_DOMAIN;
  return {
    secure: process.env.NODE_ENV === 'production',
    ...(domain ? { domain } : {}),
  };
}

export function setAccessCookie(res: NextResponse, token: string): void {
  const base = cookieBaseOpts();
  res.cookies.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
    ...base,
  });
}

export function setRefreshCookie(res: NextResponse, token: string): void {
  const base = cookieBaseOpts();
  res.cookies.set(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
    ...base,
  });
}

export function clearAuthCookies(res: NextResponse): void {
  const base = cookieBaseOpts();
  res.cookies.set(ACCESS_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    ...base,
  });
  res.cookies.set(REFRESH_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
    ...base,
  });
}
