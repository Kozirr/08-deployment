import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/current-user';
import { publicArtist, publicAlbum, publicTrack } from '@/lib/db/serializers';
import { ArtistBody } from './ArtistBody';

type Params = { id: string };

export default async function ArtistPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const artist = await prisma.artist.findUnique({
    where: { id },
    include: {
      _count: { select: { followers: true } },
      tracks: {
        take: 5,
        orderBy: { plays: 'desc' },
        include: { album: true, artist: true },
      },
      albums: {
        orderBy: { year: 'desc' },
        include: { artist: true },
      },
    },
  });
  if (!artist) notFound();

  const isFollowed = user
    ? !!(await prisma.follow.findUnique({
        where: { userId_artistId: { userId: user.id, artistId: id } },
      }))
    : false;

  const likedIds = user
    ? new Set(
        (
          await prisma.like.findMany({
            where: { userId: user.id, trackId: { in: artist.tracks.map((t) => t.id) } },
            select: { trackId: true },
          })
        ).map((l) => l.trackId),
      )
    : new Set<string>();

  const serialized = {
    ...publicArtist(artist, { isFollowed }),
    topTracks: artist.tracks.map((t) => publicTrack(t, { isLiked: likedIds.has(t.id) })),
    albums: artist.albums.map((a) => ({ ...publicAlbum(a), tracks: [] })),
  };

  return <ArtistBody artist={serialized} signedIn={!!user} />;
}
