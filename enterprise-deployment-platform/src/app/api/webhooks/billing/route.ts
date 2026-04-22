import { createHmac, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { ApiError, handleRoute, ok } from '@/lib/api/errors';
import { audit } from '@/lib/audit/log';
import { getWebhookSecret } from '@/lib/auth/secrets';
import { getClientIp, getUserAgent } from '@/lib/api/request';

const WebhookBodySchema = z.object({
  event: z.enum([
    'subscription.activated',
    'subscription.past_due',
    'subscription.canceled',
    'subscription.renewed',
  ]),
  userId: z.string().min(1),
  tier: z.enum(['FREE', 'PREMIUM', 'FAMILY']).optional(),
  currentPeriodEnd: z.string().datetime().optional(),
});

function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const secret = getWebhookSecret();
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return false;
  return timingSafeEqual(sigBuf, expBuf);
}

export const POST = handleRoute(async (req: NextRequest) => {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature');
  if (!verifySignature(rawBody, signature)) {
    throw new ApiError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
  }

  const body = WebhookBodySchema.parse(JSON.parse(rawBody));

  const statusMap = {
    'subscription.activated': 'ACTIVE',
    'subscription.renewed': 'ACTIVE',
    'subscription.past_due': 'PAST_DUE',
    'subscription.canceled': 'CANCELED',
  } as const;

  const status = statusMap[body.event];

  await prisma.subscription.upsert({
    where: { userId: body.userId },
    create: {
      userId: body.userId,
      tier: body.tier ?? 'PREMIUM',
      status,
      currentPeriodEnd: body.currentPeriodEnd ? new Date(body.currentPeriodEnd) : null,
    },
    update: {
      status,
      tier: body.tier ?? undefined,
      currentPeriodEnd: body.currentPeriodEnd ? new Date(body.currentPeriodEnd) : undefined,
    },
  });

  await audit({
    action: 'WEBHOOK_BILLING',
    actorId: body.userId,
    targetType: 'Subscription',
    targetId: body.userId,
    metadata: { event: body.event, tier: body.tier },
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
  });

  return ok({ received: true });
});
