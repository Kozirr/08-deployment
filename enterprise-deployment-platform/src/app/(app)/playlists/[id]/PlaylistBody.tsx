'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Playlist } from '@/types/music';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { TrackRow } from '@/components/music/TrackRow';
import { updatePlaylistAction, deletePlaylistAction } from '@/app/actions/playlist';
import { useLikeTrack } from '@/lib/hooks/useSocial';
import { usePlayback } from '@/lib/hooks/usePlayback';
import type { ActionResult } from '@/app/actions/common';
import { formatDuration } from '@/lib/format';

export function PlaylistBody({
  playlist,
  canEdit,
}: {
  playlist: Playlist & { createdAt?: string; updatedAt?: string };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const likeTrack = useLikeTrack();
  const { start, denialMessage, dismissDenial } = usePlayback();

  const totalDuration = playlist.tracks.reduce((sum, t) => sum + t.durationSeconds, 0);

  async function handleDelete() {
    if (!confirm('Delete this playlist? This cannot be undone.')) return;
    setDeleting(true);
    const res = await deletePlaylistAction(playlist.id);
    if (res.ok) router.push('/library');
    else {
      alert(res.error);
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col">
      <header
        className="flex items-end gap-6 p-6 md:p-8"
        style={{
          background: `linear-gradient(180deg, ${playlist.coverFromColor} 0%, transparent 100%)`,
        }}
      >
        <div
          className="w-48 h-48 rounded-card shadow-card shrink-0"
          style={{
            background: `linear-gradient(135deg, ${playlist.coverFromColor}, ${playlist.coverToColor})`,
          }}
          aria-hidden
        />
        <div className="flex flex-col gap-2 min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide">
            {playlist.isPublic ? 'Public playlist' : 'Private playlist'}
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight truncate">
            {playlist.title}
          </h1>
          {playlist.description && <p className="text-sm text-muted">{playlist.description}</p>}
          <p className="text-sm">
            <span className="font-semibold">{playlist.ownerName}</span>
            <span className="text-muted">
              {' '}
              · {playlist.tracks.length} tracks · {formatDuration(totalDuration)}
            </span>
          </p>
        </div>
      </header>

      <div className="px-6 md:px-8 flex items-center gap-3 pb-4">
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            const first = playlist.tracks[0];
            if (first) void start(first, 'playlist');
          }}
          disabled={playlist.tracks.length === 0}
        >
          ▶ Play
        </Button>
        {canEdit && (
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        )}
      </div>

      <Card className="mx-6 md:mx-8 p-2">
        {playlist.tracks.length === 0 ? (
          <p className="p-6 text-sm text-muted">No tracks yet — add some from the search page.</p>
        ) : (
          <div className="flex flex-col">
            {playlist.tracks.map((t, i) => (
              <div key={t.id} className="flex items-center">
                <div className="flex-1 min-w-0">
                  <TrackRow track={t} index={i} onPlay={(track) => void start(track, 'playlist')} />
                </div>
                <div className="flex items-center gap-2 pr-4">
                  {t.premiumOnly && <Badge tone="violet">Premium</Badge>}
                  <button
                    type="button"
                    aria-label={t.isLiked ? 'Unlike' : 'Like'}
                    onClick={() => likeTrack(t.id, !t.isLiked)}
                    className={`text-lg ${
                      t.isLiked ? 'text-spotify-green-400' : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {t.isLiked ? '♥' : '♡'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {denialMessage && (
        <div className="mx-6 md:mx-8 mt-3 rounded-card bg-surface-elevated p-3 text-sm flex items-center justify-between gap-3">
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

      {canEdit && editOpen && (
        <EditPlaylistModal
          playlist={playlist}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EditPlaylistModal({
  playlist,
  onClose,
  onSaved,
}: {
  playlist: Playlist;
  onClose: () => void;
  onSaved: () => void;
}) {
  const boundUpdate = updatePlaylistAction.bind(null, playlist.id);
  const [state, formAction, pending] = useActionState<ActionResult<{ id: string }> | null, FormData>(
    async (prev, form) => {
      const res = await boundUpdate(prev, form);
      if (res.ok) onSaved();
      return res;
    },
    null,
  );

  return (
    <Modal open onClose={onClose} title="Edit playlist">
      <form action={formAction} className="flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">Title</label>
        <Input
          name="title"
          defaultValue={playlist.title}
          error={state && !state.ok ? state.fieldErrors?.title : undefined}
        />
        <label className="text-xs font-semibold uppercase tracking-wide text-muted mt-2">Description</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={playlist.description}
          className="rounded-card bg-surface-elevated p-3 text-sm resize-none"
        />
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">From color</label>
            <input
              type="color"
              name="coverFromColor"
              defaultValue={playlist.coverFromColor}
              className="h-10 w-full rounded-card bg-surface-elevated"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-muted">To color</label>
            <input
              type="color"
              name="coverToColor"
              defaultValue={playlist.coverToColor}
              className="h-10 w-full rounded-card bg-surface-elevated"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3">
          <input
            type="checkbox"
            name="isPublic"
            defaultChecked={playlist.isPublic ?? true}
            className="h-4 w-4 accent-spotify-green-400"
          />
          <span className="text-sm">Public</span>
        </label>
        {state && !state.ok && !state.fieldErrors && (
          <p className="text-sm text-accent-pink">{state.error}</p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
