'use client';

import useSWR from 'swr';
import { fetcher } from './fetcher';
import type { Artist } from '@/types/music';

type Response = { artist: Artist };

export function useArtist(id: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Response>(
    id ? `/api/artists/${id}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  return { artist: data?.artist ?? null, isLoading, error, mutate };
}
