import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { ChangeSubscriptionSchema } from '@/lib/validation/schemas';
import { handleRoute, ok } from '@/lib/api/errors';
import { audit } from '@/lib/audit/log';
import { getClientIp, getUserAgent } from '@/lib/api/request';
import { parseSubscriptionStatus, parseSubscriptionTier } from '@/lib/validation/enums';

function normalizeSubscription(
  sub: { tier: string; status: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean } | null,
) {
  if (!sub) return null;
  return {
    tier: parseSubscriptionTier(sub.tier),
    status: parseSubscriptionStatus(sub.status),
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  };
}

export const GET = handleRoute(async () => {
  const user = await requireUser();
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  return ok({ subscription: normalizeSubscription(sub) });
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireUser();
  const body = ChangeSubscriptionSchema.parse(await req.json());

  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const sub = await prisma.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier: body.tier,
      status: body.tier === 'FREE' ? 'ACTIVE' : 'ACTIVE',
      currentPeriodEnd: body.tier === 'FREE' ? null : periodEnd,
    },
    update: {
      tier: body.tier,
      status: 'ACTIVE',
      currentPeriodEnd: body.tier === 'FREE' ? null : periodEnd,
      cancelAtPeriodEnd: false,
    },
  });

  await audit({
    action: 'SUBSCRIPTION_CHANGE',
    actorId: user.id,
    targetType: 'Subscription',
    targetId: sub.id,
    metadata: { tier: body.tier },
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ subscription: normalizeSubscription(sub) });
});
