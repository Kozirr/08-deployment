import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { NotFoundError, handleRoute, ok } from '@/lib/api/errors';
import { audit } from '@/lib/audit/log';
import { getClientIp, getUserAgent } from '@/lib/api/request';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();

  const artist = await prisma.artist.findUnique({ where: { id } });
  if (!artist) throw new NotFoundError('Artist not found');

  await prisma.follow.upsert({
    where: { userId_artistId: { userId: user.id, artistId: id } },
    create: { userId: user.id, artistId: id },
    update: {},
  });

  await audit({
    action: 'FOLLOW',
    actorId: user.id,
    targetType: 'Artist',
    targetId: id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ following: true });
});

export const DELETE = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();

  await prisma.follow
    .delete({ where: { userId_artistId: { userId: user.id, artistId: id } } })
    .catch(() => null);

  await audit({
    action: 'UNFOLLOW',
    actorId: user.id,
    targetType: 'Artist',
    targetId: id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ following: false });
});
