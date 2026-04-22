import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { handleRoute, ok } from '@/lib/api/errors';
import { publicArtist } from '@/lib/db/serializers';

export const GET = handleRoute(async () => {
  const user = await requireUser();
  const follows = await prisma.follow.findMany({
    where: { userId: user.id },
    include: { artist: { include: { _count: { select: { followers: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  return ok({ artists: follows.map((f) => publicArtist(f.artist, { isFollowed: true })) });
});
