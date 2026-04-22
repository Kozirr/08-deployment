import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { handleRoute, ok } from '@/lib/api/errors';
import { SearchTypeSchema } from '@/lib/validation/schemas';
import { publicAlbum, publicArtist, publicPlaylistSummary, publicTrack } from '@/lib/db/serializers';

export const GET = handleRoute(async (req: NextRequest) => {
  const url = new URL(req.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const type = SearchTypeSchema.parse(url.searchParams.get('type') ?? 'all');

  if (!q) return ok({ query: '', type, tracks: [], artists: [], albums: [], playlists: [] });

  const wantTracks = type === 'all' || type === 'tracks';
  const wantArtists = type === 'all' || type === 'artists';
  const wantAlbums = type === 'all' || type === 'albums';
  const wantPlaylists = type === 'all' || type === 'playlists';

  const [tracks, artists, albums, playlists] = await Promise.all([
    wantTracks
      ? prisma.track.findMany({
          where: { title: { contains: q } },
          include: { album: true, artist: true },
          take: 20,
          orderBy: { plays: 'desc' },
        })
      : [],
    wantArtists
      ? prisma.artist.findMany({
          where: { name: { contains: q } },
          include: { _count: { select: { followers: true } } },
          take: 10,
          orderBy: { monthlyListeners: 'desc' },
        })
      : [],
    wantAlbums
      ? prisma.album.findMany({
          where: { title: { contains: q } },
          include: { artist: true },
          take: 10,
          orderBy: { year: 'desc' },
        })
      : [],
    wantPlaylists
      ? prisma.playlist.findMany({
          where: { title: { contains: q }, isPublic: true },
          include: { owner: true, _count: { select: { tracks: true } } },
          take: 10,
          orderBy: { updatedAt: 'desc' },
        })
      : [],
  ]);

  return ok({
    query: q,
    type,
    tracks: tracks.map((t) => publicTrack(t)),
    artists: artists.map((a) => publicArtist(a)),
    albums: albums.map((a) => publicAlbum(a)),
    playlists: playlists.map((p) => publicPlaylistSummary(p)),
  });
});
