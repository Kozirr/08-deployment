import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { requireRole } from '@/lib/rbac/requireRole';
import { handleRoute, ok } from '@/lib/api/errors';

export const GET = handleRoute(async () => {
  const user = await requireUser();
  requireRole(user, ['ADMIN']);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [users, tracks, plays24h, loginsFailed24h, subsActive, subsPast, premiumOnlyTracks] =
    await Promise.all([
      prisma.user.count(),
      prisma.track.count(),
      prisma.playEvent.count({ where: { startedAt: { gte: since } } }),
      prisma.auditLog.count({ where: { action: 'LOGIN_FAILED', createdAt: { gte: since } } }),
      prisma.subscription.count({ where: { status: 'ACTIVE', tier: { not: 'FREE' } } }),
      prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
      prisma.track.count({ where: { premiumOnly: true } }),
    ]);

  return ok({
    users,
    tracks,
    plays24h,
    loginsFailed24h,
    subsActive,
    subsPast,
    premiumOnlyTracks,
  });
});
