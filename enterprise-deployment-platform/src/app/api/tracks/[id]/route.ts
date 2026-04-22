import { prisma } from '@/lib/db/prisma';
import { NotFoundError, handleRoute, ok } from '@/lib/api/errors';
import { getCurrentUser } from '@/lib/auth/current-user';
import { publicTrack } from '@/lib/db/serializers';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const user = await getCurrentUser();

  const track = await prisma.track.findUnique({
    where: { id },
    include: { album: true, artist: true },
  });
  if (!track) throw new NotFoundError('Track not found');

  const isLiked = user
    ? await prisma.like
        .findUnique({ where: { userId_trackId: { userId: user.id, trackId: id } } })
        .then(Boolean)
    : false;

  return ok({ track: publicTrack(track, { isLiked }) });
});
