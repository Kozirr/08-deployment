import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/current-user';
import { AdminUsersClient } from './AdminUsersClient';

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') notFound();

  const users = await prisma.user.findMany({
    include: { subscription: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return (
    <AdminUsersClient
      users={users.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        avatarColor: u.avatarColor,
        createdAt: u.createdAt.toISOString(),
        subscriptionTier: u.subscription?.tier ?? null,
      }))}
    />
  );
}
