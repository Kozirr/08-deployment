import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser, requireUser } from '@/lib/auth/current-user';
import { UpdatePlaylistSchema } from '@/lib/validation/schemas';
import { ForbiddenError, NotFoundError, handleRoute, ok } from '@/lib/api/errors';
import { audit } from '@/lib/audit/log';
import { getClientIp, getUserAgent } from '@/lib/api/request';
import { publicPlaylist } from '@/lib/db/serializers';

type Ctx = { params: Promise<{ id: string }> };

async function loadPlaylist(id: string) {
  return prisma.playlist.findUnique({
    where: { id },
    include: {
      owner: true,
      tracks: {
        orderBy: { position: 'asc' },
        include: { track: { include: { album: true, artist: true } } },
      },
    },
  });
}

export const GET = handleRoute(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await getCurrentUser();

  const playlist = await loadPlaylist(id);
  if (!playlist) throw new NotFoundError('Playlist not found');
  if (!playlist.isPublic && playlist.ownerId !== user?.id && user?.role !== 'ADMIN') {
    throw new ForbiddenError('This playlist is private');
  }

  const likedTrackIds = user
    ? await prisma.like
        .findMany({
          where: { userId: user.id, trackId: { in: playlist.tracks.map((pt) => pt.trackId) } },
        })
        .then((rows) => new Set(rows.map((r) => r.trackId)))
    : new Set<string>();

  return ok({ playlist: publicPlaylist(playlist, { likedTrackIds }) });
});

export const PUT = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  const body = UpdatePlaylistSchema.parse(await req.json());

  const existing = await prisma.playlist.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Playlist not found');
  if (existing.ownerId !== user.id && user.role !== 'ADMIN') {
    throw new ForbiddenError('You can only edit your own playlists');
  }

  const updated = await prisma.playlist.update({
    where: { id },
    data: body,
    include: {
      owner: true,
      tracks: {
        orderBy: { position: 'asc' },
        include: { track: { include: { album: true, artist: true } } },
      },
    },
  });

  await audit({
    action: 'PLAYLIST_UPDATE',
    actorId: user.id,
    targetType: 'Playlist',
    targetId: id,
    metadata: { changedFields: Object.keys(body) },
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ playlist: publicPlaylist(updated) });
});

export const DELETE = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();

  const existing = await prisma.playlist.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Playlist not found');
  if (existing.ownerId !== user.id && user.role !== 'ADMIN') {
    throw new ForbiddenError('You can only delete your own playlists');
  }

  await prisma.playlist.delete({ where: { id } });

  await audit({
    action: 'PLAYLIST_DELETE',
    actorId: user.id,
    targetType: 'Playlist',
    targetId: id,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ deleted: true });
});
