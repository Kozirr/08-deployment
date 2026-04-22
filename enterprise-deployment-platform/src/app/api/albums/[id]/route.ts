import { prisma } from '@/lib/db/prisma';
import { NotFoundError, handleRoute, ok } from '@/lib/api/errors';
import { getCurrentUser } from '@/lib/auth/current-user';
import { publicAlbum, publicTrack } from '@/lib/db/serializers';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await getCurrentUser();

  const album = await prisma.album.findUnique({
    where: { id },
    include: {
      artist: true,
      tracks: { orderBy: { createdAt: 'asc' }, include: { artist: true, album: true } },
    },
  });
  if (!album) throw new NotFoundError('Album not found');

  const likedTrackIds = user
    ? await prisma.like
        .findMany({ where: { userId: user.id, trackId: { in: album.tracks.map((t) => t.id) } } })
        .then((rows) => new Set(rows.map((r) => r.trackId)))
    : new Set<string>();

  return ok({
    album: {
      ...publicAlbum(album),
      tracks: album.tracks.map((t) => publicTrack(t, { isLiked: likedTrackIds.has(t.id) })),
    },
  });
});
