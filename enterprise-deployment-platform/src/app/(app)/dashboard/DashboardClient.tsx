'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/auth/AuthContext';
import { useRecentPlays } from '@/lib/hooks/useRecentPlays';
import { useRecommendations } from '@/lib/hooks/useRecommendations';
import { useLibrary } from '@/lib/hooks/useLibrary';
import { TrackRow } from '@/components/music/TrackRow';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatRelativeTime } from '@/lib/format';
import { usePlayback } from '@/lib/hooks/usePlayback';

export function DashboardClient() {
  return (
    <ProtectedRoute fallback={<DashboardSkeleton />}>
      <DashboardBody />
    </ProtectedRoute>
  );
}

function DashboardBody() {
  const { user } = useAuth();
  const { history, isLoading: historyLoading } = useRecentPlays(6);
  const { tracks, isLoading: recsLoading } = useRecommendations();
  const { counts } = useLibrary();
  const { start, denialMessage, dismissDenial } = usePlayback();

  const tier = user?.subscription?.tier ?? 'FREE';
  const status = user?.subscription?.status ?? null;

  return (
    <div className="flex flex-col gap-8 p-6 max-w-6xl mx-auto w-full">
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">
          Welcome back, {user?.displayName}
        </h1>
        <p className="text-muted text-sm mt-1">
          Live recommendations update every 15 seconds.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs uppercase text-muted font-semibold tracking-wider">Subscription</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xl font-bold">{tier}</span>
            {status && <Badge tone={tier === 'FREE' ? 'neutral' : 'green'}>{status}</Badge>}
          </div>
          <Link href="/account" className="text-xs underline text-muted hover:text-foreground mt-2 inline-block">
            Manage
          </Link>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted font-semibold tracking-wider">Playlists</p>
          <p className="text-xl font-bold mt-2">{counts.playlists}</p>
          <Link href="/library" className="text-xs underline text-muted hover:text-foreground inline-block mt-2">
            View library
          </Link>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase text-muted font-semibold tracking-wider">Following</p>
          <p className="text-xl font-bold mt-2">
            {counts.follows} <span className="text-sm text-muted font-normal">artists</span>
          </p>
          <p className="text-xs text-muted mt-2">{counts.likes} liked tracks</p>
        </Card>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Recently played</h2>
          <span className="text-xs text-muted">Auto-refreshing</span>
        </div>
        <Card className="mt-3 p-2">
          {historyLoading ? (
            <Skeleton className="h-24" />
          ) : history.length === 0 ? (
            <p className="p-6 text-sm text-muted">
              No plays yet — start listening and it&apos;ll show up here.
            </p>
          ) : (
            <ul className="flex flex-col">
              {history.map((h, i) => (
                <li key={h.id} className="flex items-center gap-4 px-4 py-2 rounded-card hover:bg-surface-hover">
                  <span className="w-6 text-sm text-muted tabular-nums">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{h.track.title}</p>
                    <p className="text-sm text-muted truncate">{h.track.artist}</p>
                  </div>
                  <span className="text-xs text-muted hidden md:block">
                    {formatRelativeTime(new Date(h.startedAt))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section>
        <h2 className="text-xl font-bold">Recommended for you</h2>
        <Card className="mt-3 p-2">
          {recsLoading ? (
            <Skeleton className="h-24" />
          ) : tracks.length === 0 ? (
            <p className="p-6 text-sm text-muted">
              Follow a few artists to unlock personal recommendations.
            </p>
          ) : (
            <div className="flex flex-col">
              {tracks.slice(0, 8).map((t, i) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  index={i}
                  showPlays
                  onPlay={(track) => void start(track, 'dashboard')}
                />
              ))}
            </div>
          )}
        </Card>
      </section>

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

function DashboardSkeleton() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40" />
      <Skeleton className="h-64" />
    </div>
  );
}
