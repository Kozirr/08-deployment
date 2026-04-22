'use client';

import { useEffect, useState } from 'react';
import useSWRImmutable from 'swr/immutable';
import { fetcher } from './fetcher';
import type { Album, Artist, PlaylistSummary, Track } from '@/types/music';

type Response = {
  query: string;
  type: string;
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: PlaylistSummary[];
};

function useDebounced<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useSearch(query: string, type: 'all' | 'tracks' | 'albums' | 'artists' | 'playlists' = 'all') {
  const q = useDebounced(query.trim(), 250);
  const key = q.length > 0 ? `/api/search?q=${encodeURIComponent(q)}&type=${type}` : null;
  const { data, error, isLoading } = useSWRImmutable<Response>(key, fetcher);
  return {
    results: data ?? null,
    isLoading: q.length > 0 && isLoading,
    error,
    debouncedQuery: q,
  };
}
