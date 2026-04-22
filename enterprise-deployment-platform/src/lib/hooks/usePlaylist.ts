'use client';

import useSWR from 'swr';
import { apiFetch, fetcher } from './fetcher';
import type { Playlist } from '@/types/music';

type Response = { playlist: Playlist };

export function usePlaylist(id: string | null | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Response>(
    id ? `/api/playlists/${id}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  return {
    playlist: data?.playlist ?? null,
    isLoading,
    error,
    mutate,
  };
}

export async function reorderPlaylistTracks(playlistId: string, trackIds: string[]) {
  return apiFetch(`/api/playlists/${playlistId}/tracks`, {
    method: 'PUT',
    body: JSON.stringify({ trackIds }),
  });
}
