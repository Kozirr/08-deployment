'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Track } from '@/types/music';

type PlayerContextValue = {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
  play: (track: Track) => void;
  toggle: () => void;
  setProgress: (pct: number) => void;
  setVolume: (pct: number) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgressState] = useState(0);
  const [volume, setVolume] = useState(70);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTicker = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTicker();
    if (!isPlaying || !currentTrack) return;
    const stepPct = 100 / currentTrack.durationSeconds;
    intervalRef.current = setInterval(() => {
      setProgressState((p) => {
        const next = p + stepPct;
        if (next >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return next;
      });
    }, 1000);
    return clearTicker;
  }, [isPlaying, currentTrack, clearTicker]);

  const play = useCallback((track: Track) => {
    setCurrentTrack(track);
    setProgressState(0);
    setIsPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying((p) => !p);
  }, [currentTrack]);

  const setProgress = useCallback((pct: number) => {
    setProgressState(Math.min(100, Math.max(0, pct)));
  }, []);

  return (
    <PlayerContext.Provider
      value={{ currentTrack, isPlaying, progress, volume, play, toggle, setProgress, setVolume }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
