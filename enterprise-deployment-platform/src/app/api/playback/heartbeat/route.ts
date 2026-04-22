import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { PlaybackHeartbeatSchema } from '@/lib/validation/schemas';
import { ForbiddenError, NotFoundError, handleRoute, ok } from '@/lib/api/errors';

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  const body = PlaybackHeartbeatSchema.parse(await req.json());

  const playEvent = await prisma.playEvent.findUnique({ where: { id: body.playEventId } });
  if (!playEvent) throw new NotFoundError('Play event not found');
  if (playEvent.userId !== user.id) throw new ForbiddenError('Not your play event');

  await prisma.playEvent.update({
    where: { id: body.playEventId },
    data: { completedMs: body.completedMs },
  });

  return ok({ success: true });
});
