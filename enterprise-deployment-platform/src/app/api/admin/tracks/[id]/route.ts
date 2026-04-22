import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { requireRole } from '@/lib/rbac/requireRole';
import { AdminUpdateTrackSchema } from '@/lib/validation/schemas';
import { NotFoundError, handleRoute, ok } from '@/lib/api/errors';
import { audit } from '@/lib/audit/log';
import { getClientIp, getUserAgent } from '@/lib/api/request';
import { publicTrack } from '@/lib/db/serializers';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  requireRole(user, ['ADMIN']);

  const body = AdminUpdateTrackSchema.parse(await req.json());

  const existing = await prisma.track.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Track not found');

  const updated = await prisma.track.update({
    where: { id },
    data: body,
    include: { album: true, artist: true },
  });

  await audit({
    action: 'ADMIN_ACTION',
    actorId: user.id,
    targetType: 'Track',
    targetId: id,
    metadata: { kind: 'update-track', changes: body },
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ track: publicTrack(updated) });
});
