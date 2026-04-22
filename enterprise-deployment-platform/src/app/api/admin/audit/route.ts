import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { requireRole } from '@/lib/rbac/requireRole';
import { handleRoute, ok } from '@/lib/api/errors';
import { parsePagination } from '@/lib/api/request';

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, ['ADMIN']);

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const { skip, take, page, pageSize } = parsePagination(req, { pageSize: 50 });

  const where = action ? { action } : {};
  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      include: { actor: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return ok({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      actor: l.actor ? { id: l.actor.id, email: l.actor.email, displayName: l.actor.displayName } : null,
      targetType: l.targetType,
      targetId: l.targetId,
      metadata: l.metadataJson ? JSON.parse(l.metadataJson) : null,
      ip: l.ip,
      userAgent: l.userAgent,
      createdAt: l.createdAt.toISOString(),
    })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});
