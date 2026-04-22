import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { ACCESS_COOKIE } from './cookies';
import { verifyAccessToken } from './tokens';
import { parseSubscriptionStatus, parseSubscriptionTier, parseUserRole } from '@/lib/validation/enums';
import { publicUser } from '@/lib/db/serializers';
import type { CurrentUser } from '@/types/music';

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  const claims = await verifyAccessToken(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    include: { subscription: true },
  });
  if (!user) return null;

  return {
    ...publicUser(user),
    role: parseUserRole(user.role),
    subscription: user.subscription
      ? {
          tier: parseSubscriptionTier(user.subscription.tier),
          status: parseSubscriptionStatus(user.subscription.status),
          currentPeriodEnd: user.subscription.currentPeriodEnd?.toISOString() ?? null,
        }
      : null,
  };
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
