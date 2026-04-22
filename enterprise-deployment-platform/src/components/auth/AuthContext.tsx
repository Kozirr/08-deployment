'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { apiFetch } from '@/lib/hooks/fetcher';
import type { CurrentUser, UserRole } from '@/types/music';

type AuthContextValue = {
  user: CurrentUser | null;
  isLoading: boolean;
  role: UserRole | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const { user, isLoading, mutate: mutateMe } = useCurrentUser();

  const refresh = useCallback(async () => {
    await mutateMe();
  }, [mutateMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await mutateMe();
      // re-fetch everything that depends on auth
      await globalMutate(() => true);
    },
    [globalMutate, mutateMe],
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName }),
      });
      await mutateMe();
      await globalMutate(() => true);
    },
    [globalMutate, mutateMe],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore — we clear local state below regardless
    }
    await mutateMe(undefined, { revalidate: false });
    await globalMutate(() => true, undefined, { revalidate: false });
    router.push('/login');
  }, [globalMutate, mutateMe, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      role: user?.role ?? null,
      login,
      register,
      logout,
      refresh,
    }),
    [user, isLoading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
