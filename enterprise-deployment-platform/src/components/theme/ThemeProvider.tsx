'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { PlayerProvider } from '@/components/player/PlayerProvider';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange={false}
    >
      <PlayerProvider>{children}</PlayerProvider>
    </NextThemesProvider>
  );
}
