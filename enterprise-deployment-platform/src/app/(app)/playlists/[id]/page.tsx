import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/current-user';
import { publicPlaylist } from '@/lib/db/serializers';
import { PlaylistBody } from './PlaylistBody';

type Params = { id: string };

export default async function PlaylistPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      owner: true,
      tracks: { include: { track: { include: { album: true, artist: true } } } },
    },
  });

  if (!playlist) notFound();

  // Enforce visibility: private playlists viewable only by owner/admin
  if (!playlist.isPublic && (!user || (user.id !== playlist.ownerId && user.role !== 'ADMIN'))) {
    notFound();
  }

  const likedTrackIds = user
    ? new Set(
        (
          await prisma.like.findMany({
            where: { userId: user.id, trackId: { in: playlist.tracks.map((pt) => pt.trackId) } },
            select: { trackId: true },
          })
        ).map((l) => l.trackId),
      )
    : new Set<string>();

  const serialized = publicPlaylist(playlist, { likedTrackIds });
  const canEdit = !!user && (user.id === playlist.ownerId || user.role === 'ADMIN');

  return <PlaylistBody playlist={serialized} canEdit={canEdit} />;
}
