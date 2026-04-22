import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { handleRoute, ok } from '@/lib/api/errors';
import { publicTrack } from '@/lib/db/serializers';

/**
 * Recommendations: tracks from artists the user follows OR in the catalog's
 * top plays, excluding tracks already liked. Rudimentary content-based logic
 * sufficient to demonstrate the shape — a real system would use a vector store.
 */
export const GET = handleRoute(async () => {
  const user = await requireUser();

  const [follows, likedIds] = await Promise.all([
    prisma.follow.findMany({ where: { userId: user.id }, select: { artistId: true } }),
    prisma.like.findMany({ where: { userId: user.id }, select: { trackId: true } }),
  ]);

  const followedArtistIds = follows.map((f) => f.artistId);
  const excludedTrackIds = likedIds.map((l) => l.trackId);

  const tracks = await prisma.track.findMany({
    where: {
      id: excludedTrackIds.length > 0 ? { notIn: excludedTrackIds } : undefined,
      ...(followedArtistIds.length > 0 ? { artistId: { in: followedArtistIds } } : {}),
    },
    include: { album: true, artist: true },
    orderBy: [{ plays: 'desc' }, { createdAt: 'desc' }],
    take: 12,
  });

  const likedSet = new Set(excludedTrackIds);
  return ok({ tracks: tracks.map((t) => publicTrack(t, { isLiked: likedSet.has(t.id) })) });
});
