'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useLibrary } from '@/lib/hooks/useLibrary';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { TrackRow } from '@/components/music/TrackRow';
import { cn } from '@/lib/cn';
import { usePlayback } from '@/lib/hooks/usePlayback';

type Tab = 'playlists' | 'likes' | 'follows';

export function LibraryClient() {
  return (
    <ProtectedRoute fallback={<Skeleton className="m-6 h-64" />}>
      <LibraryBody />
    </ProtectedRoute>
  );
}

function LibraryBody() {
  const [tab, setTab] = useState<Tab>('playlists');
  const { playlists, likes, follows, counts, isLoading } = useLibrary();
  const { start, denialMessage, dismissDenial } = usePlayback();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Your Library</h1>
        <Link href="/playlists/new">
          <Button variant="primary" size="sm">
            New playlist
          </Button>
        </Link>
      </header>

      <div role="tablist" className="flex gap-2 border-b border-border">
        {(['playlists', 'likes', 'follows'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-semibold capitalize border-b-2',
              tab === t
                ? 'border-spotify-green-400 text-foreground'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {t === 'playlists' ? `Playlists (${counts.playlists})` : null}
            {t === 'likes' ? `Liked tracks (${counts.likes})` : null}
            {t === 'follows' ? `Following (${counts.follows})` : null}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : tab === 'playlists' ? (
        playlists.length === 0 ? (
          <EmptyState
            title="No playlists yet"
            cta={{ href: '/playlists/new', label: 'Create your first playlist' }}
          />
        ) : (
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
            {playlists.map((p) => (
              <Link key={p.id} href={`/playlists/${p.id}`}>
                <Card interactive className="p-3 h-full">
                  <div
                    className="w-full aspect-square rounded-sm mb-3"
                    style={{
                      background: `linear-gradient(135deg, ${p.coverFromColor}, ${p.coverToColor})`,
                    }}
                    aria-hidden
                  />
                  <p className="font-semibold truncate">{p.title}</p>
                  <p className="text-xs text-muted truncate">
                    {p.trackCount} tracks · {p.ownerName}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : tab === 'likes' ? (
        likes.length === 0 ? (
          <EmptyState title="No liked tracks yet" />
        ) : (
          <Card className="p-2">
            <div className="flex flex-col">
              {likes.map((t, i) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  index={i}
                  onPlay={(track) => void start(track, 'library')}
                />
              ))}
            </div>
          </Card>
        )
      ) : follows.length === 0 ? (
        <EmptyState title="Not following anyone yet" />
      ) : (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
          {follows.map((a) => (
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

function EmptyState({ title, cta }: { title: string; cta?: { href: string; label: string } }) {
  return (
    <Card className="text-center p-12">
      <p className="text-muted">{title}</p>
      {cta && (
        <Link href={cta.href}>
          <Button variant="primary" size="md" className="mt-4">
            {cta.label}
          </Button>
        </Link>
      )}
    </Card>
  );
}
