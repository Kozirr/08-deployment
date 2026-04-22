'use client';

import useSWR from 'swr';
import { fetcher } from './fetcher';
import type { Artist, PlaylistSummary, Track } from '@/types/music';

type Response = {
  playlists: PlaylistSummary[];
  likes: Track[];
  follows: Artist[];
  counts: { playlists: number; likes: number; follows: number };
};

export function useLibrary() {
  const { data, error, isLoading, mutate } = useSWR<Response>('/api/me/library', fetcher, {
    revalidateOnFocus: false,
  });
  return {
    playlists: data?.playlists ?? [],
    likes: data?.likes ?? [],
    follows: data?.follows ?? [],
    counts: data?.counts ?? { playlists: 0, likes: 0, follows: 0 },
    isLoading,
    error,
    mutate,
  };
}
