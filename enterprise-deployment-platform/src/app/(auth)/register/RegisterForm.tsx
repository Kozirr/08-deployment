'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FetchError } from '@/lib/hooks/fetcher';

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await register(email, password, displayName);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof FetchError) setError(err.message);
      else setError('Unable to create account.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted mt-1">Free to listen. Upgrade anytime.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="displayName">
          Display name
        </label>
        <Input
          id="displayName"
          name="displayName"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <label className="text-xs font-semibold uppercase tracking-wide text-muted mt-2" htmlFor="email">
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
        <label className="text-xs font-semibold uppercase tracking-wide text-muted mt-2" htmlFor="password">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted">At least 8 characters.</p>
        {error && (
          <p role="alert" className="text-sm text-accent-pink">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" size="md" disabled={pending} className="mt-2">
          {pending ? 'Creating…' : 'Sign up'}
        </Button>
      </form>

      <div className="text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-foreground underline hover:text-spotify-green-400">
          Log in
        </Link>
      </div>
    </div>
  );
}
