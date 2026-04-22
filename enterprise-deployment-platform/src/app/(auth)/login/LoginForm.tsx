'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FetchError } from '@/lib/hooks/fetcher';

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email, password);
      const next = search.get('next') || '/dashboard';
      router.push(next);
    } catch (err) {
      if (err instanceof FetchError) setError(err.message);
      else setError('Unable to log in. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Log in to Tempo</h1>
        <p className="text-sm text-muted mt-1">Welcome back — sign in to continue.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label
          className="text-xs font-semibold uppercase tracking-wide text-muted mt-2"
          htmlFor="password"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-accent-pink">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="md" disabled={pending} className="mt-2">
          {pending ? 'Signing in…' : 'Log in'}
        </Button>
      </form>

      <div className="text-sm text-muted">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-foreground underline hover:text-spotify-green-400">
          Sign up
        </Link>
      </div>

      <aside className="rounded-card bg-surface p-4 text-xs text-muted">
        <p className="font-semibold text-foreground mb-1">Demo accounts</p>
        <p>user@demo.test · artist@demo.test · admin@demo.test</p>
        <p>Passwords are printed by the seeder on first run — see the server log.</p>
      </aside>
    </div>
  );
}
