'use client';

import { type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { ThemeProvider } from 'next-themes';
import { fetcher } from '@/lib/hooks/fetcher';
import { AuthProvider } from '@/components/auth/AuthContext';
import { PlayerProvider } from '@/components/player/PlayerProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: false,
          shouldRetryOnError: false,
        }}
      >
        <AuthProvider>
          <PlayerProvider>{children}</PlayerProvider>
        </AuthProvider>
      </SWRConfig>
    </ThemeProvider>
  );
}
