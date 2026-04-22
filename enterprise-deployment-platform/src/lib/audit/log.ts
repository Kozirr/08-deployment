import { prisma } from '@/lib/db/prisma';
import type { AuditAction } from '@/lib/validation/enums';

type AuditInput = {
  action: AuditAction;
  actorId?: string | null;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

/** Redacts the last octet of an IPv4 address for PII-sensitive storage. */
export function truncateIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.split(',')[0]?.trim() ?? ip;
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }
  if (trimmed.includes(':')) {
    // IPv6 — keep only the first 3 segments
    const segs = trimmed.split(':').slice(0, 3);
    return segs.join(':') + '::';
  }
  return trimmed;
}

export async function audit(entry: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        metadataJson: entry.metadata ? JSON.stringify(entry.metadata) : null,
        ip: truncateIp(entry.ip),
        userAgent: entry.userAgent?.slice(0, 500) ?? null,
      },
    });
  } catch (err) {
    // Never let audit write failures break primary flows.
    console.error('[audit] write failed:', err);
  }
}
