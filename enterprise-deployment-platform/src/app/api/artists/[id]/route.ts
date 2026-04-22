import { prisma } from '@/lib/db/prisma';
import { NotFoundError, handleRoute, ok } from '@/lib/api/errors';
import { getCurrentUser } from '@/lib/auth/current-user';
import { publicAlbum, publicArtist, publicTrack } from '@/lib/db/serializers';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await getCurrentUser();

  const artist = await prisma.artist.findUnique({
    where: { id },
    include: {
      albums: { orderBy: { year: 'desc' } },
      _count: { select: { followers: true } },
    },
  });
  if (!artist) throw new NotFoundError('Artist not found');

  const topTracks = await prisma.track.findMany({
    where: { artistId: id },
    orderBy: { plays: 'desc' },
    take: 10,
    include: { album: true, artist: true },
  });

  const [isFollowed, likedTrackIds] = await Promise.all([
    user
      ? prisma.follow
          .findUnique({ where: { userId_artistId: { userId: user.id, artistId: id } } })
          .then(Boolean)
      : Promise.resolve(false),
    user
      ? prisma.like
          .findMany({ where: { userId: user.id, trackId: { in: topTracks.map((t) => t.id) } } })
          .then((rows) => new Set(rows.map((r) => r.trackId)))
      : Promise.resolve(new Set<string>()),
  ]);

  return ok({
    artist: {
      ...publicArtist(artist, { isFollowed }),
      albums: artist.albums.map((a) => publicAlbum({ ...a, artist })),
      topTracks: topTracks.map((t) =>
        publicTrack(t, { isLiked: likedTrackIds.has(t.id) }),
      ),
    },
  });
});
