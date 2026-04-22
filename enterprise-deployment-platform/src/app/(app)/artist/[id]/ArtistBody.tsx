'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Artist } from '@/types/music';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { TrackRow } from '@/components/music/TrackRow';
import { formatMonthlyListeners } from '@/lib/format';
import { useFollowArtist } from '@/lib/hooks/useSocial';
import { usePlayback } from '@/lib/hooks/usePlayback';

export function ArtistBody({ artist, signedIn }: { artist: Artist; signedIn: boolean }) {
  const [followed, setFollowed] = useState(!!artist.isFollowed);
  const followArtist = useFollowArtist();
  const { start, denialMessage, dismissDenial } = usePlayback();

  async function toggleFollow() {
    const next = !followed;
    setFollowed(next); // optimistic
    try {
      await followArtist(artist.id, next);
    } catch {
      setFollowed(!next); // rollback
    }
  }

  return (
    <div className="flex flex-col">
      <header
        className="flex items-end gap-6 p-6 md:p-8"
        style={{ background: `linear-gradient(180deg, ${artist.imageColor} 0%, transparent 100%)` }}
      >
        <div
          className="w-48 h-48 rounded-full shadow-card shrink-0"
          style={{ backgroundColor: artist.imageColor }}
          aria-hidden
        />
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2">
            {artist.verified && <Badge tone="blue">Verified artist</Badge>}
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight truncate">
            {artist.name}
          </h1>
          <p className="text-sm text-muted">
            {formatMonthlyListeners(artist.monthlyListeners)} monthly listeners
          </p>
        </div>
      </header>

      <div className="px-6 md:px-8 flex items-center gap-3 pb-4">
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            const first = artist.topTracks[0];
            if (first) void start(first, 'artist');
          }}
          disabled={artist.topTracks.length === 0}
        >
          ▶ Play
        </Button>
        {signedIn && (
          <Button variant="secondary" size="sm" onClick={toggleFollow}>
            {followed ? 'Following' : 'Follow'}
          </Button>
        )}
      </div>

      <section className="px-6 md:px-8 py-4">
        <h2 className="text-xl font-bold mb-3">Popular</h2>
        <Card className="p-2">
          <div className="flex flex-col">
            {artist.topTracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                index={i}
                showPlays
                onPlay={(track) => void start(track, 'artist')}
              />
            ))}
          </div>
        </Card>
      </section>

      <section className="px-6 md:px-8 py-4">
        <h2 className="text-xl font-bold mb-3">Albums</h2>
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
          {artist.albums.map((a) => (
            <Link key={a.id} href={`/artist/${artist.id}`}>
              <Card interactive className="p-3">
                <div
                  className="w-full aspect-square rounded-sm mb-3"
                  style={{
                    background: `linear-gradient(135deg, ${a.coverColor}, ${a.coverAccent})`,
                  }}
                  aria-hidden
                />
                <p className="font-semibold truncate">{a.title}</p>
                <p className="text-xs text-muted">{a.year} · Album</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {artist.bio && (
        <section className="px-6 md:px-8 py-4">
          <h2 className="text-xl font-bold mb-3">About</h2>
          <Card>
            <p className="text-sm text-muted whitespace-pre-line">{artist.bio}</p>
          </Card>
        </section>
      )}

      {denialMessage && (
        <div className="mx-6 md:mx-8 my-3 rounded-card bg-surface-elevated p-3 text-sm flex items-center justify-between gap-3">
          <span className="text-accent-pink">{denialMessage}</span>
          <button
            type="button"
            onClick={dismissDenial}
            className="text-xs text-muted hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
