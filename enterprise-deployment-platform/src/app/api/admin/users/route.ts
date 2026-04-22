import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { requireRole } from '@/lib/rbac/requireRole';
import { handleRoute, ok } from '@/lib/api/errors';
import { parsePagination } from '@/lib/api/request';
import { publicUser } from '@/lib/db/serializers';

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  requireRole(user, ['ADMIN']);

  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const { skip, take, page, pageSize } = parsePagination(req, { pageSize: 25 });

  const where = q
    ? { OR: [{ email: { contains: q } }, { displayName: { contains: q } }] }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { subscription: true, _count: { select: { playlists: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return ok({
    users: users.map((u) => ({
      ...publicUser(u),
      createdAt: u.createdAt.toISOString(),
      playlistCount: u._count.playlists,
      subscription: u.subscription
        ? { tier: u.subscription.tier, status: u.subscription.status }
        : null,
    })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});
