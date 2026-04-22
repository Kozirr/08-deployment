import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { createSession } from '@/lib/auth/session';
import { setAccessCookie, setRefreshCookie } from '@/lib/auth/cookies';
import { RegisterSchema } from '@/lib/validation/schemas';
import { ConflictError, handleRoute, ok } from '@/lib/api/errors';
import { audit } from '@/lib/audit/log';
import { getClientIp, getUserAgent } from '@/lib/api/request';
import { publicUser } from '@/lib/db/serializers';

const PALETTE = ['#1db954', '#e13300', '#8400e7', '#0d72ea', '#e91429', '#158a7e', '#e8115b'];

export const POST = handleRoute(async (req: NextRequest) => {
  const body = RegisterSchema.parse(await req.json());

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new ConflictError('An account with that email already exists');

  const passwordHash = await hashPassword(body.password);
  const avatarColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];

  const user = await prisma.user.create({
    data: {
      email: body.email,
      displayName: body.displayName,
      passwordHash,
      avatarColor,
      role: 'USER',
      subscription: { create: { tier: 'FREE', status: 'ACTIVE' } },
    },
  });

  const ip = getClientIp(req);
  const ua = getUserAgent(req);
  const tokens = await createSession(user.id, 'USER', { ip: ip ?? undefined, userAgent: ua ?? undefined });

  await audit({
    action: 'REGISTER',
    actorId: user.id,
    targetType: 'User',
    targetId: user.id,
    ip,
    userAgent: ua,
  });

  const res = ok({ user: publicUser(user) }, { status: 201 });
  setAccessCookie(res, tokens.accessToken);
  setRefreshCookie(res, tokens.refreshToken);
  return res;
});
