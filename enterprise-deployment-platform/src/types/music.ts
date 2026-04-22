export type Artist = {
  id: string;
  name: string;
  imageColor: string;
  monthlyListeners: number;
  bio: string;
  verified?: boolean;
  topTracks: Track[];
  albums: Album[];
  followers?: number;
  isFollowed?: boolean;
};

export type Album = {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  year: number;
  coverColor: string;
  coverAccent: string;
  tracks: Track[];
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
  albumId?: string;
  durationSeconds: number;
  plays?: number;
  explicit?: boolean;
  premiumOnly?: boolean;
  isLiked?: boolean;
};

export type Playlist = {
  id: string;
  title: string;
  description: string;
  ownerName: string;
  ownerId?: string;
  isPublic?: boolean;
  coverFromColor: string;
  coverToColor: string;
  tracks: Track[];
};

export type PlaylistSummary = {
  id: string;
  title: string;
  description: string;
  ownerName: string;
  coverFromColor: string;
  coverToColor: string;
  trackCount: number;
};

export type Category = {
  id: string;
  label: string;
  color: string;
};

export type UserRole = 'USER' | 'ARTIST' | 'ADMIN';

export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'FAMILY';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING';

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarColor: string;
  subscription: {
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    currentPeriodEnd: string | null;
  } | null;
};
