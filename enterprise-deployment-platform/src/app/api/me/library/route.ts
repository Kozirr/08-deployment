import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { handleRoute, ok } from '@/lib/api/errors';
import { publicArtist, publicPlaylistSummary, publicTrack } from '@/lib/db/serializers';

export const GET = handleRoute(async () => {
  const user = await requireUser();

  const [playlists, likes, follows] = await Promise.all([
    prisma.playlist.findMany({
      where: { ownerId: user.id },
      include: { owner: true, _count: { select: { tracks: true } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.like.findMany({
      where: { userId: user.id },
      include: { track: { include: { album: true, artist: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.follow.findMany({
      where: { userId: user.id },
      include: { artist: { include: { _count: { select: { followers: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return ok({
    playlists: playlists.map((p) => publicPlaylistSummary(p)),
    likes: likes.map((l) => publicTrack(l.track, { isLiked: true })),
    follows: follows.map((f) => publicArtist(f.artist, { isFollowed: true })),
    counts: {
      playlists: playlists.length,
      likes: likes.length,
      follows: follows.length,
    },
  });
});
