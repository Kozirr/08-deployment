import type { User, Artist, Album, Track, Playlist, PlaylistTrack } from '@prisma/client';
import { parseUserRole } from '@/lib/validation/enums';

/** Strips passwordHash and normalizes the user shape for public responses. */
export function publicUser(
  user: User,
): { id: string; email: string; displayName: string; role: ReturnType<typeof parseUserRole>; avatarColor: string } {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: parseUserRole(user.role),
    avatarColor: user.avatarColor,
  };
}

export function publicArtist(
  artist: Artist & { _count?: { followers?: number; tracks?: number } },
  opts: { isFollowed?: boolean } = {},
) {
  return {
    id: artist.id,
    name: artist.name,
    bio: artist.bio,
    imageColor: artist.imageColor,
    monthlyListeners: artist.monthlyListeners,
    verified: artist.verified,
    followers: artist._count?.followers ?? 0,
    isFollowed: opts.isFollowed ?? false,
  };
}

export function publicAlbum(album: Album & { artist?: Artist }) {
  return {
    id: album.id,
    title: album.title,
    year: album.year,
    coverColor: album.coverColor,
    coverAccent: album.coverAccent,
    artistId: album.artistId,
    artist: album.artist?.name ?? '',
  };
}

export function publicTrack(
  track: Track & { album?: Album; artist?: Artist },
  opts: { isLiked?: boolean } = {},
) {
  return {
    id: track.id,
    title: track.title,
    durationSeconds: track.durationSeconds,
    plays: track.plays,
    explicit: track.explicit,
    premiumOnly: track.premiumOnly,
    albumId: track.albumId,
    album: track.album?.title ?? '',
    artistId: track.artistId,
    artist: track.artist?.name ?? '',
    isLiked: opts.isLiked ?? false,
  };
}

export function publicPlaylist(
  playlist: Playlist & {
    owner?: User;
    tracks?: (PlaylistTrack & { track: Track & { album?: Album; artist?: Artist } })[];
  },
  opts: { likedTrackIds?: Set<string> } = {},
) {
  const trackList = (playlist.tracks ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((pt) =>
      publicTrack(pt.track, { isLiked: opts.likedTrackIds?.has(pt.trackId) ?? false }),
    );
  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    ownerId: playlist.ownerId,
    ownerName: playlist.owner?.displayName ?? '',
    coverFromColor: playlist.coverFromColor,
    coverToColor: playlist.coverToColor,
    isPublic: playlist.isPublic,
    createdAt: playlist.createdAt.toISOString(),
    updatedAt: playlist.updatedAt.toISOString(),
    tracks: trackList,
  };
}

export function publicPlaylistSummary(
  playlist: Playlist & { owner?: User; _count?: { tracks?: number } },
) {
  return {
    id: playlist.id,
    title: playlist.title,
    description: playlist.description,
    ownerName: playlist.owner?.displayName ?? '',
    coverFromColor: playlist.coverFromColor,
    coverToColor: playlist.coverToColor,
    trackCount: playlist._count?.tracks ?? 0,
  };
}
