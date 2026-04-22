'use client';

import useSWR from 'swr';
import { fetcher } from './fetcher';
import type { Track } from '@/types/music';

type Response = { tracks: Track[] };

export function useRecommendations() {
  const { data, error, isLoading, mutate } = useSWR<Response>(
    '/api/me/recommendations',
    fetcher,
    { revalidateOnFocus: false },
  );
  return { tracks: data?.tracks ?? [], isLoading, error, mutate };
}
