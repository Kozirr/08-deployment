import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/current-user';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/Card';

export const metadata = { title: 'Admin — Tempo' };

export default async function AdminHome() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') notFound();

  const [userCount, playlistCount, playCount, auditCount, premiumSubs] = await Promise.all([
    prisma.user.count(),
    prisma.playlist.count(),
    prisma.playEvent.count(),
    prisma.auditLog.count(),
    prisma.subscription.count({ where: { tier: { not: 'FREE' }, status: 'ACTIVE' } }),
  ]);

  const stats = [
    { label: 'Users', value: userCount },
    { label: 'Playlists', value: playlistCount },
    { label: 'Plays logged', value: playCount },
    { label: 'Audit entries', value: auditCount },
    { label: 'Paid subscriptions', value: premiumSubs },
  ];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Admin console</h1>
        <p className="text-sm text-muted">Platform-wide visibility, gated by role=ADMIN.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs uppercase text-muted font-semibold">{s.label}</p>
            <p className="text-2xl font-bold mt-2">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/users">
          <Card interactive>
            <h2 className="font-bold">Users</h2>
            <p className="text-sm text-muted mt-1">Manage roles, display names, deletions.</p>
          </Card>
        </Link>
        <Link href="/admin/audit">
          <Card interactive>
            <h2 className="font-bold">Audit log</h2>
            <p className="text-sm text-muted mt-1">Every auth, playback, and admin action.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
