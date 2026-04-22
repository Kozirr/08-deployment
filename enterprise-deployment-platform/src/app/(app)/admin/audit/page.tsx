import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth/current-user';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default async function AdminAuditPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') notFound();

  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { actor: true },
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted">Last 100 events · IP truncated to /24 for PII safety.</p>
      </header>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-muted text-xs uppercase">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Target</th>
              <th className="p-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="p-3 text-xs text-muted whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleString()}
                </td>
                <td className="p-3">{e.actor?.displayName ?? <span className="text-muted">system</span>}</td>
                <td className="p-3">
                  <Badge tone="blue">{e.action}</Badge>
                </td>
                <td className="p-3 text-xs">
                  {e.targetType} <span className="text-muted">{e.targetId?.slice(0, 8)}</span>
                </td>
                <td className="p-3 text-xs text-muted">{e.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
