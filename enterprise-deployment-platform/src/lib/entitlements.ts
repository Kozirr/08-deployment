import type { Track, Subscription } from '@prisma/client';
import * as Sentry from '@sentry/nextjs';
import type { CurrentUser } from '@/types/music';

/**
 * Core DRM-style gate: determines whether a user can play a track.
 * Premium-only tracks require an ACTIVE or TRIALING subscription on PREMIUM/FAMILY.
 * Admins bypass for diagnostics.
 *
 * Wrapped in a Sentry span so gate decisions can be traced in production — this
 * is the hotspot called out in PLATFORM-INSIGHTS as the priority instrumentation target.
 */
export function canPlayTrack(
  user: CurrentUser | null,
  track: Pick<Track, 'premiumOnly'>,
): { allowed: boolean; reason?: string } {
  return Sentry.startSpan(
    { op: 'drm.canPlayTrack', name: 'canPlayTrack' },
    (span) => {
      const result = evaluate(user, track);
      span?.setAttribute('track.premiumOnly', Boolean(track.premiumOnly));
      span?.setAttribute('user.role', user?.role ?? 'anonymous');
      span?.setAttribute('user.tier', user?.subscription?.tier ?? 'none');
      span?.setAttribute('gate.allowed', result.allowed);
      if (!result.allowed && result.reason) {
        span?.setAttribute('gate.reason', result.reason);
      }
      return result;
    },
  );
}

function evaluate(
  user: CurrentUser | null,
  track: Pick<Track, 'premiumOnly'>,
): { allowed: boolean; reason?: string } {
  if (!track.premiumOnly) return { allowed: true };
  if (!user) return { allowed: false, reason: 'Login required for premium track' };
  if (user.role === 'ADMIN') return { allowed: true };

  const sub = user.subscription;
  if (!sub) return { allowed: false, reason: 'Premium subscription required' };
  if (sub.tier === 'FREE') return { allowed: false, reason: 'Upgrade to Premium to play this track' };
  if (sub.status !== 'ACTIVE' && sub.status !== 'TRIALING') {
    return { allowed: false, reason: 'Subscription is not active' };
  }
  return { allowed: true };
}

export function isActivePremium(
  subscription: Pick<Subscription, 'tier' | 'status'> | null,
): boolean {
  if (!subscription) return false;
  if (subscription.tier === 'FREE') return false;
  return subscription.status === 'ACTIVE' || subscription.status === 'TRIALING';
}
