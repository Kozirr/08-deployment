'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import type { UserRole } from '@/types/music';

type Props = {
  children: ReactNode;
  roles?: UserRole[];
  fallback?: ReactNode;
};

/**
 * Client guard — complements the edge proxy. Redirects unauthenticated users
 * to /login?next=<current path>. Renders fallback when role doesn't match
 * (the proxy already blocks, but this avoids flashes during client-side nav).
 */
export function ProtectedRoute({ children, roles, fallback = null }: Props) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const next = encodeURIComponent(pathname || '/');
      router.replace(`/login?next=${next}`);
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading || !user) return <>{fallback}</>;
  if (roles && !roles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
