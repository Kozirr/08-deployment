'use client';

import { useSWRConfig } from 'swr';
import { apiFetch } from './fetcher';

/**
 * Optimistic like/unlike with rollback on error.
 * Mutates any cached SWR key that returns { track(s) }: /api/me/library, /api/me/likes,
 * /api/tracks/[id], /api/playlists/[id], /api/search*.
 */
export function useLikeTrack() {
  const { mutate } = useSWRConfig();

  return async function likeTrack(trackId: string, nextLiked: boolean) {
    // Optimistically flip isLiked on any matching cached tracks.
    const patch = (data: unknown): unknown => {
      if (!data || typeof data !== 'object') return data;
      const obj = data as Record<string, unknown>;
      const patched = { ...obj };
      for (const [k, v] of Object.entries(obj)) {
        if (Array.isArray(v)) {
          patched[k] = v.map((item) =>
            item && typeof item === 'object' && 'id' in item && (item as { id: string }).id === trackId
              ? { ...item, isLiked: nextLiked }
              : item,
          );
        } else if (v && typeof v === 'object') {
          patched[k] = patch(v);
        }
      }
      return patched;
    };

    await mutate(
      (key) => typeof key === 'string' && key.startsWith('/api/'),
      (data: unknown) => patch(data),
      { revalidate: false },
    );

    try {
      await apiFetch(`/api/tracks/${trackId}/like`, { method: nextLiked ? 'POST' : 'DELETE' });
      // revalidate library so counts refresh
      await mutate('/api/me/library');
    } catch (err) {
      // rollback by revalidating affected keys
      await mutate((key) => typeof key === 'string' && key.startsWith('/api/'));
      throw err;
    }
  };
}

export function useFollowArtist() {
  const { mutate } = useSWRConfig();
  return async function followArtist(artistId: string, nextFollowed: boolean) {
    try {
      await apiFetch(`/api/artists/${artistId}/follow`, {
        method: nextFollowed ? 'POST' : 'DELETE',
      });
      await mutate((key) => typeof key === 'string' && key.startsWith('/api/'));
    } catch (err) {
      await mutate((key) => typeof key === 'string' && key.startsWith('/api/'));
      throw err;
    }
  };
}
