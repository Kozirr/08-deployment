'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireUser } from '@/lib/auth/current-user';
import { ChangeSubscriptionSchema } from '@/lib/validation/schemas';
import { audit } from '@/lib/audit/log';
import { actionError, type ActionResult } from './common';

export async function changeSubscriptionAction(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult<{ tier: string }>> {
  try {
    const user = await requireUser();
    const input = ChangeSubscriptionSchema.parse({ tier: form.get('tier') });

    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const sub = await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        tier: input.tier,
        status: 'ACTIVE',
        currentPeriodEnd: input.tier === 'FREE' ? null : periodEnd,
      },
      update: {
        tier: input.tier,
        status: 'ACTIVE',
        currentPeriodEnd: input.tier === 'FREE' ? null : periodEnd,
        cancelAtPeriodEnd: false,
      },
    });
    await audit({
      action: 'SUBSCRIPTION_CHANGE',
      actorId: user.id,
      targetType: 'Subscription',
      targetId: sub.id,
      metadata: { tier: input.tier },
    });
    revalidatePath('/account');
    revalidatePath('/dashboard');
    return { ok: true, data: { tier: input.tier } };
  } catch (err) {
    return actionError(err);
  }
}
