import { z } from 'zod';
import { SubscriptionTier } from './enums';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  displayName: z.string().min(1).max(60).trim(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

// ─── Profile ──────────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(60).trim().optional(),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex color')
    .optional(),
});

// ─── Playlists ────────────────────────────────────────────────────────────────

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a 6-digit hex color');

export const CreatePlaylistSchema = z.object({
  title: z.string().min(1).max(80).trim(),
  description: z.string().max(300).default(''),
  coverFromColor: hexColor.default('#1db954'),
  coverToColor: hexColor.default('#0d5f28'),
  isPublic: z.boolean().default(true),
});
export type CreatePlaylistInput = z.infer<typeof CreatePlaylistSchema>;

export const UpdatePlaylistSchema = CreatePlaylistSchema.partial();

export const AddPlaylistTrackSchema = z.object({
  trackId: z.string().min(1),
  position: z.number().int().min(0).optional(),
});

export const ReorderPlaylistSchema = z.object({
  trackIds: z.array(z.string().min(1)).min(1).max(500),
});

// ─── Playback ─────────────────────────────────────────────────────────────────

export const PlaybackStartSchema = z.object({
  trackId: z.string().min(1),
  deviceId: z.string().max(64).optional(),
  source: z.string().max(40).optional(),
});

export const PlaybackHeartbeatSchema = z.object({
  playEventId: z.string().min(1),
  completedMs: z.number().int().min(0).max(24 * 60 * 60 * 1000),
});

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const ChangeSubscriptionSchema = z.object({
  tier: SubscriptionTier,
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const AdminUpdateUserSchema = z.object({
  role: z.enum(['USER', 'ARTIST', 'ADMIN']).optional(),
  displayName: z.string().min(1).max(60).optional(),
});

export const AdminUpdateTrackSchema = z.object({
  premiumOnly: z.boolean().optional(),
  explicit: z.boolean().optional(),
});

// ─── Search ───────────────────────────────────────────────────────────────────

export const SearchTypeSchema = z.enum(['all', 'tracks', 'albums', 'artists', 'playlists']);
