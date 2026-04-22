import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { handleRoute, ok } from '@/lib/api/errors';
import { publicTrack } from '@/lib/db/serializers';

export const GET = handleRoute(async () => {
  const user = await requireUser();
  const likes = await prisma.like.findMany({
    where: { userId: user.id },
    include: { track: { include: { album: true, artist: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return ok({ tracks: likes.map((l) => publicTrack(l.track, { isLiked: true })) });
});
