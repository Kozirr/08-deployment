import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { CreatePlaylistSchema } from '@/lib/validation/schemas';
import { handleRoute, ok } from '@/lib/api/errors';
import { audit } from '@/lib/audit/log';
import { getClientIp, getUserAgent, parsePagination } from '@/lib/api/request';
import { publicPlaylistSummary } from '@/lib/db/serializers';

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  const { skip, take, page, pageSize } = parsePagination(req, { pageSize: 30 });

  const [total, playlists] = await Promise.all([
    prisma.playlist.count({ where: { ownerId: user.id } }),
    prisma.playlist.findMany({
      where: { ownerId: user.id },
      include: { owner: true, _count: { select: { tracks: true } } },
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
    }),
  ]);

  return ok({
    playlists: playlists.map((p) => publicPlaylistSummary(p)),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  const body = CreatePlaylistSchema.parse(await req.json());

  const playlist = await prisma.playlist.create({
    data: { ...body, ownerId: user.id },
    include: { owner: true, _count: { select: { tracks: true } } },
  });

  await audit({
    action: 'PLAYLIST_CREATE',
    actorId: user.id,
    targetType: 'Playlist',
    targetId: playlist.id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ playlist: publicPlaylistSummary(playlist) }, { status: 201 });
});
