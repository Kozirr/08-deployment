'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ContrastToggle } from '@/components/theme/ContrastToggle';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { useAuth } from '@/components/auth/AuthContext';

export function TopBar() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 md:px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-2">
        <Button variant="icon" size="sm" aria-label="Back" onClick={() => router.back()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </Button>
        <Button variant="icon" size="sm" aria-label="Forward" onClick={() => router.forward()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
          </svg>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <ContrastToggle />
        <ThemeToggle />
        {isLoading ? null : user ? (
          <>
            {user.role !== 'USER' && (
              <Badge tone={user.role === 'ADMIN' ? 'violet' : 'blue'}>{user.role}</Badge>
            )}
            <Link
              href="/account"
              className="text-sm font-semibold hover:underline text-foreground"
            >
              {user.displayName}
            </Link>
            <Button variant="secondary" size="sm" onClick={logout}>
              Log out
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={() => router.push('/register')}>
              Sign up
            </Button>
            <Button variant="primary" size="sm" onClick={() => router.push('/login')}>
              Log in
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
