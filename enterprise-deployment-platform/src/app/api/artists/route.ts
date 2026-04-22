import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleRoute, ok } from '@/lib/api/errors';
import { parsePagination } from '@/lib/api/request';
import { publicArtist } from '@/lib/db/serializers';

export const GET = handleRoute(async (req: NextRequest) => {
  const { skip, take, page, pageSize } = parsePagination(req, { pageSize: 30 });
  const [total, artists] = await Promise.all([
    prisma.artist.count(),
    prisma.artist.findMany({
      skip,
      take,
      orderBy: { monthlyListeners: 'desc' },
      include: { _count: { select: { followers: true, tracks: true } } },
    }),
  ]);
  return ok({
    artists: artists.map((a) => publicArtist(a)),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});
