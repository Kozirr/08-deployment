'use client';

import { useState } from 'react';
import type { Track } from '@/types/music';
import { formatDuration, formatPlays } from '@/lib/format';
import { EqualizerBars } from '@/components/ui/EqualizerBars';
import { cn } from '@/lib/cn';

type TrackRowProps = {
  track: Track;
  index: number;
  nowPlayingId?: string;
  onPlay?: (track: Track) => void;
  showPlays?: boolean;
  showAlbum?: boolean;
};

export function TrackRow({
  track,
  index,
  nowPlayingId,
  onPlay,
  showPlays,
  showAlbum = true,
}: TrackRowProps) {
  const [hover, setHover] = useState(false);
  const isPlaying = nowPlayingId === track.id;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onDoubleClick={() => onPlay?.(track)}
      className={cn(
        'group grid items-center gap-4 rounded-card px-4 py-2 cursor-pointer',
        'grid-cols-[2rem_1fr_auto] md:grid-cols-[2rem_1fr_1fr_auto]',
        isPlaying ? 'text-spotify-green-400' : 'text-foreground',
        'hover:bg-surface-hover',
      )}
    >
      <div className="flex items-center justify-center w-6 h-6 text-sm tabular-nums text-muted">
        {isPlaying ? (
          <EqualizerBars active />
        ) : hover ? (
          <button
            type="button"
            aria-label={`Play ${track.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.(track);
            }}
            className="text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        ) : (
          <span>{index + 1}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium">{track.title}</p>
        <p className="truncate text-sm text-muted">{track.artist}</p>
      </div>
      {showAlbum && (
        <p className="hidden md:block truncate text-sm text-muted">
          {showPlays ? formatPlays(track.plays) : track.album}
        </p>
      )}
      <p className="tabular-nums text-sm text-muted">{formatDuration(track.durationSeconds)}</p>
    </div>
  );
}
