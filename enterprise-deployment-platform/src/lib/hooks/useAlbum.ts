'use client';

import useSWR from 'swr';
import { fetcher } from './fetcher';
import type { Album } from '@/types/music';

type Response = { album: Album };

export function useAlbum(id: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Response>(
    id ? `/api/albums/${id}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  return { album: data?.album ?? null, isLoading, error, mutate };
}
