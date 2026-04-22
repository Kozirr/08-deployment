import { cookies } from 'next/headers';
import { REFRESH_COOKIE, clearAuthCookies } from '@/lib/auth/cookies';
import { revokeSessionByRefreshToken } from '@/lib/auth/session';
import { handleRoute, ok } from '@/lib/api/errors';
import { audit } from '@/lib/audit/log';
import { getCurrentUser } from '@/lib/auth/current-user';

export const POST = handleRoute(async () => {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const refresh = cookieStore.get(REFRESH_COOKIE)?.value;
  if (refresh) await revokeSessionByRefreshToken(refresh);
  if (user) await audit({ action: 'LOGOUT', actorId: user.id });

  const res = ok({ success: true });
  clearAuthCookies(res);
  return res;
});
