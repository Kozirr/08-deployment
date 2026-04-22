'use client';

import { useActionState, useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/auth/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { updateProfileAction, changePasswordAction } from '@/app/actions/profile';
import { changeSubscriptionAction } from '@/app/actions/subscription';
import type { ActionResult } from '@/app/actions/common';

export function AccountClient() {
  return (
    <ProtectedRoute fallback={<Skeleton className="m-6 h-64" />}>
      <AccountBody />
    </ProtectedRoute>
  );
}

function AccountBody() {
  const { user, refresh } = useAuth();
  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Account</h1>
        <p className="text-muted text-sm mt-1">{user.email}</p>
      </header>

      <ProfileCard onSaved={refresh} />
      <PasswordCard />
      <SubscriptionCard onChanged={refresh} />
    </div>
  );
}

function ProfileCard({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const [state, formAction, pending] = useActionState<ActionResult<{ updated: true }> | null, FormData>(
    async (prev, form) => {
      const res = await updateProfileAction(prev, form);
      if (res.ok) onSaved();
      return res;
    },
    null,
  );

  return (
    <Card>
      <h2 className="text-lg font-bold mb-3">Profile</h2>
      <form action={formAction} className="flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">Display name</label>
        <Input
          name="displayName"
          defaultValue={user?.displayName}
          error={state && !state.ok ? state.fieldErrors?.displayName : undefined}
        />
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">Avatar color</label>
        <Input
          name="avatarColor"
          type="color"
          defaultValue={user?.avatarColor}
          className="h-10 w-20"
          error={state && !state.ok ? state.fieldErrors?.avatarColor : undefined}
        />
        {state && !state.ok && !state.fieldErrors && (
          <p className="text-sm text-accent-pink">{state.error}</p>
        )}
        {state && state.ok && <p className="text-sm text-spotify-green-400">Saved.</p>}
        <div>
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const [state, formAction, pending] = useActionState<ActionResult<{ updated: true }> | null, FormData>(
    changePasswordAction,
    null,
  );

  return (
    <Card>
      <h2 className="text-lg font-bold mb-3">Password</h2>
      <form action={formAction} className="flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">Current password</label>
        <Input type="password" name="currentPassword" autoComplete="current-password" required />
        <label className="text-xs font-semibold uppercase tracking-wide text-muted">New password</label>
        <Input
          type="password"
          name="newPassword"
          autoComplete="new-password"
          minLength={8}
          required
          error={state && !state.ok ? state.fieldErrors?.newPassword : undefined}
        />
        {state && !state.ok && !state.fieldErrors && (
          <p className="text-sm text-accent-pink">{state.error}</p>
        )}
        {state && state.ok && (
          <p className="text-sm text-spotify-green-400">Password updated. Other sessions revoked.</p>
        )}
        <div>
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? 'Updating…' : 'Change password'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SubscriptionCard({ onChanged }: { onChanged: () => void }) {
  const { user } = useAuth();
  const [selected, setSelected] = useState(user?.subscription?.tier ?? 'FREE');
  const [state, formAction, pending] = useActionState<ActionResult<{ tier: string }> | null, FormData>(
    async (prev, form) => {
      const res = await changeSubscriptionAction(prev, form);
      if (res.ok) onChanged();
      return res;
    },
    null,
  );

  const tier = user?.subscription?.tier ?? 'FREE';

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">Subscription</h2>
        <Badge tone={tier === 'FREE' ? 'neutral' : 'green'}>{tier}</Badge>
      </div>
      <p className="text-sm text-muted">
        Free gets you the basics. Premium unlocks DRM-gated tracks and offline listening.
      </p>
      <form action={formAction} className="flex flex-col gap-3 mt-4">
        <div className="grid grid-cols-3 gap-2">
          {(['FREE', 'PREMIUM', 'FAMILY'] as const).map((t) => (
            <label
              key={t}
              className={`flex flex-col items-center gap-1 rounded-card border border-border px-3 py-4 cursor-pointer ${
                selected === t ? 'border-spotify-green-400 bg-spotify-green-900/20' : ''
              }`}
            >
              <input
                type="radio"
                name="tier"
                value={t}
                className="sr-only"
                checked={selected === t}
                onChange={() => setSelected(t)}
              />
              <span className="font-bold">{t}</span>
              <span className="text-xs text-muted">
                {t === 'FREE' ? '$0' : t === 'PREMIUM' ? '$9.99' : '$14.99'}/mo
              </span>
            </label>
          ))}
        </div>
        {state && !state.ok && <p className="text-sm text-accent-pink">{state.error}</p>}
        {state && state.ok && <p className="text-sm text-spotify-green-400">Subscription updated.</p>}
        <div>
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? 'Processing…' : 'Change plan'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
