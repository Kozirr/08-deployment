import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { AddPlaylistTrackSchema } from '@/lib/validation/schemas';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  handleRoute,
  ok,
} from '@/lib/api/errors';
import { audit } from '@/lib/audit/log';
import { getClientIp, getUserAgent } from '@/lib/api/request';

type Ctx = { params: Promise<{ id: string }> };

async function assertOwner(playlistId: string, userId: string, isAdmin: boolean) {
  const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
  if (!playlist) throw new NotFoundError('Playlist not found');
  if (playlist.ownerId !== userId && !isAdmin) {
    throw new ForbiddenError('You can only modify your own playlists');
  }
  return playlist;
}

export const POST = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  const body = AddPlaylistTrackSchema.parse(await req.json());
  await assertOwner(id, user.id, user.role === 'ADMIN');

  const track = await prisma.track.findUnique({ where: { id: body.trackId } });
  if (!track) throw new NotFoundError('Track not found');

  const existing = await prisma.playlistTrack.findUnique({
    where: { playlistId_trackId: { playlistId: id, trackId: body.trackId } },
  });
  if (existing) throw new ConflictError('Track is already in this playlist');

  const nextPosition =
    body.position ??
    (await prisma.playlistTrack.count({ where: { playlistId: id } }));

  const pt = await prisma.playlistTrack.create({
    data: { playlistId: id, trackId: body.trackId, position: nextPosition },
  });

  await prisma.playlist.update({ where: { id }, data: { updatedAt: new Date() } });

  await audit({
    action: 'PLAYLIST_ADD_TRACK',
    actorId: user.id,
    targetType: 'Playlist',
    targetId: id,
    metadata: { trackId: body.trackId },
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ added: true, position: pt.position }, { status: 201 });
});

export const DELETE = handleRoute(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await requireUser();
  const url = new URL(req.url);
  const trackId = url.searchParams.get('trackId');
  if (!trackId) throw new NotFoundError('trackId query param required');

  await assertOwner(id, user.id, user.role === 'ADMIN');

  await prisma.playlistTrack.delete({
    where: { playlistId_trackId: { playlistId: id, trackId } },
  });
  await prisma.playlist.update({ where: { id }, data: { updatedAt: new Date() } });

  await audit({
    action: 'PLAYLIST_REMOVE_TRACK',
    actorId: user.id,
    targetType: 'Playlist',
    targetId: id,
    metadata: { trackId },
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ removed: true });
});
