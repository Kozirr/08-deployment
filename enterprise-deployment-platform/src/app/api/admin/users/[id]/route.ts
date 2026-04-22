import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { requireRole } from '@/lib/rbac/requireRole';
import { AdminUpdateUserSchema } from '@/lib/validation/schemas';
import { ForbiddenError, NotFoundError, handleRoute, ok } from '@/lib/api/errors';
import { audit } from '@/lib/audit/log';
import { getClientIp, getUserAgent } from '@/lib/api/request';
import { publicUser } from '@/lib/db/serializers';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  requireRole(user, ['ADMIN']);

  const body = AdminUpdateUserSchema.parse(await req.json());

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new NotFoundError('User not found');

  const updated = await prisma.user.update({ where: { id }, data: body });

  await audit({
    action: 'ADMIN_ACTION',
    actorId: user.id,
    targetType: 'User',
    targetId: id,
    metadata: { kind: 'update', changes: body },
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ user: publicUser(updated) });
});

export const DELETE = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  requireRole(user, ['ADMIN']);

  if (id === user.id) throw new ForbiddenError('Admins cannot delete themselves');

  await prisma.user.delete({ where: { id } });

  await audit({
    action: 'ADMIN_ACTION',
    actorId: user.id,
    targetType: 'User',
    targetId: id,
    metadata: { kind: 'delete' },
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ deleted: true });
});
