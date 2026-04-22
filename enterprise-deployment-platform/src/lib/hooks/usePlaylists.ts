'use client';

import useSWR from 'swr';
import { fetcher } from './fetcher';
import type { PlaylistSummary } from '@/types/music';

type Response = { playlists: PlaylistSummary[] };

export function usePlaylists() {
  const { data, error, isLoading, mutate } = useSWR<Response>('/api/playlists', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  return {
    playlists: data?.playlists ?? [],
    isLoading,
    error,
    mutate,
  };
}
