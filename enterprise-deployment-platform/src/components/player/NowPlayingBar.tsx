'use client';

import { usePlayer } from './PlayerProvider';
import { formatDuration } from '@/lib/format';
import { AlbumCover } from '@/components/music/AlbumCover';
import { EqualizerBars } from '@/components/ui/EqualizerBars';
import styles from './NowPlayingBar.module.css';
import { cn } from '@/lib/cn';

export function NowPlayingBar() {
  const { currentTrack, isPlaying, progress, volume, toggle, setProgress, setVolume } = usePlayer();

  if (!currentTrack) {
    return (
      <footer className={cn(styles.bar, styles.empty)}>
        <p className="text-sm text-muted">Pick a track to start playing</p>
      </footer>
    );
  }

  const elapsed = Math.floor((progress / 100) * currentTrack.durationSeconds);

  return (
    <footer
      className={styles.bar}
      style={{ ['--progress' as string]: `${progress}%`, ['--volume' as string]: `${volume}%` }}
    >
      <div className={styles.meta}>
        <AlbumCover from="#1e3a8a" to="#60a5fa" title={currentTrack.album} size="sm" rounded="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{currentTrack.title}</p>
          <p className="truncate text-xs text-muted">{currentTrack.artist}</p>
        </div>
        <EqualizerBars active={isPlaying} className="hidden sm:inline-flex ml-2" />
      </div>

      <div className={styles.controls}>
        <div className={styles.buttons}>
          <button type="button" aria-label="Shuffle" className={styles.iconBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
            </svg>
          </button>
          <button type="button" aria-label="Previous" className={styles.iconBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onClick={toggle}
            className={styles.playBtn}
          >
            {isPlaying ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button type="button" aria-label="Next" className={styles.iconBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6z" />
            </svg>
          </button>
          <button type="button" aria-label="Repeat" className={styles.iconBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
            </svg>
          </button>
        </div>

        <div className={styles.progressRow}>
          <span className="tabular-nums text-xs text-muted w-10 text-right">
            {formatDuration(elapsed)}
          </span>
          <input
            type="range"
            aria-label="Progress"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className={styles.progress}
          />
          <span className="tabular-nums text-xs text-muted w-10">
            {formatDuration(currentTrack.durationSeconds)}
          </span>
        </div>
      </div>

      <div className={styles.volume}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05A4.5 4.5 0 0016.5 12zM14 3.23v2.06A7 7 0 0119 12a7 7 0 01-5 6.71v2.06A9 9 0 0014 3.23z" />
        </svg>
        <input
          type="range"
          aria-label="Volume"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className={styles.volumeSlider}
        />
      </div>
    </footer>
  );
}
