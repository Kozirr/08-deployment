import { z } from 'zod';

// SQLite stores these as strings; Zod enforces validity at every boundary.

export const UserRole = z.enum(['USER', 'ARTIST', 'ADMIN']);
export type UserRole = z.infer<typeof UserRole>;

export const SubscriptionTier = z.enum(['FREE', 'PREMIUM', 'FAMILY']);
export type SubscriptionTier = z.infer<typeof SubscriptionTier>;

export const SubscriptionStatus = z.enum(['ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING']);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatus>;

export const AuditAction = z.enum([
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'REGISTER',
  'TOKEN_REFRESH',
  'PLAY_START',
  'PLAY_DENIED',
  'LIKE',
  'UNLIKE',
  'FOLLOW',
  'UNFOLLOW',
  'PLAYLIST_CREATE',
  'PLAYLIST_UPDATE',
  'PLAYLIST_DELETE',
  'PLAYLIST_ADD_TRACK',
  'PLAYLIST_REMOVE_TRACK',
  'SUBSCRIPTION_CHANGE',
  'PROFILE_UPDATE',
  'PASSWORD_CHANGE',
  'ADMIN_ACTION',
  'WEBHOOK_BILLING',
]);
export type AuditAction = z.infer<typeof AuditAction>;

export function parseUserRole(value: string): UserRole {
  const parsed = UserRole.safeParse(value);
  return parsed.success ? parsed.data : 'USER';
}

export function parseSubscriptionTier(value: string): SubscriptionTier {
  const parsed = SubscriptionTier.safeParse(value);
  return parsed.success ? parsed.data : 'FREE';
}

export function parseSubscriptionStatus(value: string): SubscriptionStatus {
  const parsed = SubscriptionStatus.safeParse(value);
  return parsed.success ? parsed.data : 'ACTIVE';
}
