'use client';

import { useCallback, useState } from 'react';
import { apiFetch, FetchError } from '@/lib/hooks/fetcher';
import { usePlayer } from '@/components/player/PlayerProvider';
import type { Track } from '@/types/music';

type StartPlaybackResponse = {
  playEventId: string;
  track: {
    id: string;
    title: string;
    durationSeconds: number;
    album: string;
    artist: string;
    premiumOnly: boolean;
  };
};

export function usePlayback() {
  const { play } = usePlayer();
  const [denialMessage, setDenialMessage] = useState<string | null>(null);

  const start = useCallback(
    async (track: Track, source: string = 'ui') => {
      setDenialMessage(null);
      try {
        await apiFetch<StartPlaybackResponse>('/api/playback/start', {
          method: 'POST',
          body: JSON.stringify({ trackId: track.id, source }),
        });
        play(track);
      } catch (err) {
        if (err instanceof FetchError && err.status === 402) {
          setDenialMessage(err.message || 'Premium required to play this track.');
          return;
        }
        if (err instanceof FetchError && err.status === 401) {
          setDenialMessage('Please log in to play tracks.');
          return;
        }
        setDenialMessage('Unable to start playback.');
      }
    },
    [play],
  );

  const dismissDenial = useCallback(() => setDenialMessage(null), []);

  return { start, denialMessage, dismissDenial };
}
