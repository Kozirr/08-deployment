'use client';

import useSWR from 'swr';
import { apiFetch, FetchError } from './fetcher';
import type { CurrentUser } from '@/types/music';

type MeResponse = { user: CurrentUser };

export function useCurrentUser() {
  const { data, error, isLoading, mutate } = useSWR<MeResponse>(
    '/api/auth/me',
    async (url) => {
      try {
        return await apiFetch<MeResponse>(url);
      } catch (err) {
        if (err instanceof FetchError && err.status === 401) {
          return { user: null as unknown as CurrentUser };
        }
        throw err;
      }
    },
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  return {
    user: data?.user ?? null,
    isLoading,
    error,
    mutate,
  };
}
