import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { setAccessCookie, setRefreshCookie } from '@/lib/auth/cookies';
import { LoginSchema } from '@/lib/validation/schemas';
import { ApiError, handleRoute, ok } from '@/lib/api/errors';
import { audit } from '@/lib/audit/log';
import { getClientIp, getUserAgent } from '@/lib/api/request';
import { publicUser } from '@/lib/db/serializers';
import { parseUserRole } from '@/lib/validation/enums';

export const POST = handleRoute(async (req: NextRequest) => {
  const body = LoginSchema.parse(await req.json());
  const ip = getClientIp(req);
  const ua = getUserAgent(req);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) {
    await audit({ action: 'LOGIN_FAILED', metadata: { email: body.email, reason: 'not_found' }, ip, userAgent: ua });
    throw new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    await audit({
      action: 'LOGIN_FAILED',
      actorId: user.id,
      metadata: { reason: 'bad_password' },
      ip,
      userAgent: ua,
    });
    throw new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const role = parseUserRole(user.role);
  const tokens = await createSession(user.id, role, {
    ip: ip ?? undefined,
    userAgent: ua ?? undefined,
  });

  await audit({
    action: 'LOGIN',
    actorId: user.id,
    targetType: 'User',
    targetId: user.id,
    ip,
    userAgent: ua,
  });

  const res = ok({ user: publicUser(user) });
  setAccessCookie(res, tokens.accessToken);
  setRefreshCookie(res, tokens.refreshToken);
  return res;
});
