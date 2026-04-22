import { cookies } from 'next/headers';
import { REFRESH_COOKIE, clearAuthCookies, setAccessCookie, setRefreshCookie } from '@/lib/auth/cookies';
import { rotateSession } from '@/lib/auth/session';
import { ApiError, handleRoute, ok } from '@/lib/api/errors';
import { audit } from '@/lib/audit/log';

export const POST = handleRoute(async () => {
  const cookieStore = await cookies();
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refresh) throw new ApiError('Missing refresh token', 401, 'NO_REFRESH');

  const tokens = await rotateSession(refresh);
  if (!tokens) {
    const res = ok({ rotated: false }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }

  await audit({ action: 'TOKEN_REFRESH', actorId: tokens.sessionId });

  const res = ok({ rotated: true });
  setAccessCookie(res, tokens.accessToken);
  setRefreshCookie(res, tokens.refreshToken);
  return res;
});
