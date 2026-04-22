'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiFetch } from '@/lib/hooks/fetcher';

type Row = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  avatarColor: string;
  createdAt: string;
  subscriptionTier: string | null;
};

export function AdminUsersClient({ users: initial }: { users: Row[] }) {
  const [users, setUsers] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeRole(id: string, role: string) {
    setBusyId(id);
    try {
      await apiFetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setUsers((us) => us.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this user? This is irreversible.')) return;
    setBusyId(id);
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      setUsers((us) => us.filter((u) => u.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Users</h1>
        <p className="text-sm text-muted">Total {users.length}</p>
      </header>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-muted text-xs uppercase">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Tier</th>
              <th className="p-3">Joined</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: u.avatarColor }}
                      aria-hidden
                    />
                    <div>
                      <p className="font-semibold">{u.displayName}</p>
                      <p className="text-xs text-muted">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    disabled={busyId === u.id}
                    className="bg-surface-elevated rounded-card px-2 py-1 text-sm"
                  >
                    <option value="USER">USER</option>
                    <option value="ARTIST">ARTIST</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
                <td className="p-3">
                  <Badge tone={u.subscriptionTier === 'FREE' ? 'neutral' : 'green'}>
                    {u.subscriptionTier ?? '—'}
                  </Badge>
                </td>
                <td className="p-3 text-muted text-xs">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => remove(u.id)}
                    disabled={busyId === u.id}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
