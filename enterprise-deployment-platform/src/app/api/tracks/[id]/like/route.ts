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

  const track = await prisma.track.findUnique({ where: { id } });
  if (!track) throw new NotFoundError('Track not found');

  await prisma.like.upsert({
    where: { userId_trackId: { userId: user.id, trackId: id } },
    create: { userId: user.id, trackId: id },
    update: {},
  });

  await audit({
    action: 'LIKE',
    actorId: user.id,
    targetType: 'Track',
    targetId: id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ liked: true });
});

export const DELETE = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();

  await prisma.like
    .delete({ where: { userId_trackId: { userId: user.id, trackId: id } } })
    .catch(() => null); // idempotent

  await audit({
    action: 'UNLIKE',
    actorId: user.id,
    targetType: 'Track',
    targetId: id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ liked: false });
});
