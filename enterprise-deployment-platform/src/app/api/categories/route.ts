import { handleRoute, ok } from '@/lib/api/errors';
import type { Category } from '@/types/music';

const CATEGORIES: Category[] = [
  { id: 'pop', label: 'Pop', color: '#e13300' },
  { id: 'hip-hop', label: 'Hip-Hop', color: '#8400e7' },
  { id: 'rock', label: 'Rock', color: '#0d72ea' },
  { id: 'dance', label: 'Dance/Electronic', color: '#e91429' },
  { id: 'chill', label: 'Chill', color: '#158a7e' },
  { id: 'podcasts', label: 'Podcasts', color: '#af2896' },
  { id: 'indie', label: 'Indie', color: '#1e3264' },
  { id: 'jazz', label: 'Jazz', color: '#e8115b' },
];

export const GET = handleRoute(async () => ok({ categories: CATEGORIES }));
