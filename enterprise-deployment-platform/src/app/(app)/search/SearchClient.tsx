'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { TrackRow } from '@/components/music/TrackRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSearch } from '@/lib/hooks/useSearch';
import { usePlayback } from '@/lib/hooks/usePlayback';

export function SearchClient() {
  const [q, setQ] = useState('');
  const { results, isLoading, debouncedQuery } = useSearch(q);
  const { start, denialMessage, dismissDenial } = usePlayback();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      <h1 className="text-3xl font-extrabold tracking-tight">Search</h1>
      <Input
        placeholder="Artists, songs, albums, or playlists"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoFocus
      />

      {!debouncedQuery ? (
        <Card className="text-center p-12">
          <p className="text-muted">Start typing to search.</p>
        </Card>
      ) : isLoading ? (
        <Skeleton className="h-40" />
      ) : !results ? null : (
        <div className="flex flex-col gap-6">
          {results.artists.length > 0 && (
            <Section title="Artists">
              <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
                {results.artists.map((a) => (
                  <Link key={a.id} href={`/artist/${a.id}`}>
                    <Card interactive className="p-3 text-center">
                      <div
                        className="w-full aspect-square rounded-full mb-3"
                        style={{ backgroundColor: a.imageColor }}
                        aria-hidden
                      />
                      <p className="font-semibold truncate">{a.name}</p>
                      <p className="text-xs text-muted">Artist</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {results.tracks.length > 0 && (
            <Section title="Tracks">
              <Card className="p-2">
                <div className="flex flex-col">
                  {results.tracks.map((t, i) => (
                    <TrackRow
                      key={t.id}
                      track={t}
                      index={i}
                      onPlay={(track) => void start(track, 'search')}
                    />
                  ))}
                </div>
              </Card>
            </Section>
          )}

          {results.albums.length > 0 && (
            <Section title="Albums">
              <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
                {results.albums.map((a) => (
                  <Card key={a.id} className="p-3">
                    <div
                      className="w-full aspect-square rounded-sm mb-3"
                      style={{
                        background: `linear-gradient(135deg, ${a.coverColor}, ${a.coverAccent})`,
                      }}
                      aria-hidden
                    />
                    <p className="font-semibold truncate">{a.title}</p>
                    <p className="text-xs text-muted truncate">
                      {a.year} · {a.artist}
                    </p>
                  </Card>
                ))}
              </div>
            </Section>
          )}

          {results.playlists.length > 0 && (
            <Section title="Playlists">
              <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
                {results.playlists.map((p) => (
                  <Link key={p.id} href={`/playlists/${p.id}`}>
                    <Card interactive className="p-3">
                      <div
                        className="w-full aspect-square rounded-sm mb-3"
                        style={{
                          background: `linear-gradient(135deg, ${p.coverFromColor}, ${p.coverToColor})`,
                        }}
                        aria-hidden
                      />
                      <p className="font-semibold truncate">{p.title}</p>
                      <p className="text-xs text-muted truncate">{p.ownerName}</p>
                    </Card>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {results.tracks.length === 0 &&
            results.artists.length === 0 &&
            results.albums.length === 0 &&
            results.playlists.length === 0 && (
              <Card className="p-6 text-center text-muted">
                No matches for &ldquo;{debouncedQuery}&rdquo;
              </Card>
            )}
        </div>
      )}

      {denialMessage && (
        <div className="rounded-card bg-surface-elevated p-3 text-sm flex items-center justify-between gap-3">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-bold mb-3">{title}</h2>
      {children}
    </section>
  );
}
