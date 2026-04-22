import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { handleRoute, ok } from '@/lib/api/errors';
import { publicTrack } from '@/lib/db/serializers';

/**
 * Real-time playback status — SWR clients poll this at 15 s intervals.
 * Returns the user's most recent PlayEvent + current track.
 */
export const GET = handleRoute(async () => {
  const user = await requireUser();
  const recent = await prisma.playEvent.findFirst({
    where: { userId: user.id },
    include: { track: { include: { album: true, artist: true } } },
    orderBy: { startedAt: 'desc' },
  });

  if (!recent) return ok({ isPlaying: false, track: null, startedAt: null, completedMs: 0 });

  return ok({
    isPlaying: recent.completedMs < recent.track.durationSeconds * 1000,
    track: publicTrack(recent.track),
    startedAt: recent.startedAt.toISOString(),
    completedMs: recent.completedMs,
    source: recent.source,
  });
});
