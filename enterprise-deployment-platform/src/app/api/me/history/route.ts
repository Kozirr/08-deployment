import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { handleRoute, ok } from '@/lib/api/errors';
import { parsePagination } from '@/lib/api/request';
import { publicTrack } from '@/lib/db/serializers';

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  const { skip, take, page, pageSize } = parsePagination(req, { pageSize: 25 });

  const [total, events] = await Promise.all([
    prisma.playEvent.count({ where: { userId: user.id } }),
    prisma.playEvent.findMany({
      where: { userId: user.id },
      include: { track: { include: { album: true, artist: true } } },
      orderBy: { startedAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return ok({
    history: events.map((ev) => ({
      id: ev.id,
      startedAt: ev.startedAt.toISOString(),
      completedMs: ev.completedMs,
      source: ev.source,
      track: publicTrack(ev.track),
    })),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});
