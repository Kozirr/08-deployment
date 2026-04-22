'use client';

import useSWR from 'swr';
import { fetcher } from './fetcher';
import type { Track } from '@/types/music';

type HistoryItem = {
  id: string;
  startedAt: string;
  completedMs: number;
  source: string | null;
  track: Track;
};
type Response = {
  history: HistoryItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

/** Polls every 15 seconds — stand-in for real-time updates per the plan. */
export function useRecentPlays(pageSize = 10) {
  const { data, error, isLoading, mutate } = useSWR<Response>(
    `/api/me/history?pageSize=${pageSize}`,
    fetcher,
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
    },
  );
  return {
    history: data?.history ?? [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
}
