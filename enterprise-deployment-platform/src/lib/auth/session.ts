import { createHash } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import {
  REFRESH_TOKEN_TTL_SECONDS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './tokens';
import { parseUserRole } from '@/lib/validation/enums';

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type IssuedTokens = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
};

export async function createSession(
  userId: string,
  role: ReturnType<typeof parseUserRole>,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<IssuedTokens> {
  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: '',
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  const accessToken = await signAccessToken(userId, role);
  const refreshToken = await signRefreshToken(userId, session.id);

  await prisma.session.update({
    where: { id: session.id },
    data: { refreshTokenHash: hashRefreshToken(refreshToken) },
  });

  return { accessToken, refreshToken, sessionId: session.id };
}

export async function rotateSession(rawRefreshToken: string): Promise<IssuedTokens | null> {
  const claims = await verifyRefreshToken(rawRefreshToken);
  if (!claims) return null;

  const session = await prisma.session.findUnique({
    where: { id: claims.sid },
    include: { user: true },
  });
  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt < new Date()) return null;
  if (session.refreshTokenHash !== hashRefreshToken(rawRefreshToken)) {
    // token reuse — revoke all sessions for this user defensively
    await prisma.session.updateMany({
      where: { userId: session.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  await prisma.session.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  return createSession(session.userId, parseUserRole(session.user.role));
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeSessionByRefreshToken(rawRefreshToken: string): Promise<void> {
  const claims = await verifyRefreshToken(rawRefreshToken);
  if (!claims) return;
  await revokeSession(claims.sid);
}
