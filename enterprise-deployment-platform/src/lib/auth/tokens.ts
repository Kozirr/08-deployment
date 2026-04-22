import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getAccessSecret, getRefreshSecret } from './secrets';
import type { UserRole } from '@/lib/validation/enums';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type AccessTokenClaims = JWTPayload & {
  sub: string;
  role: UserRole;
  typ: 'access';
};

export type RefreshTokenClaims = JWTPayload & {
  sub: string;
  sid: string;
  typ: 'refresh';
};

export async function signAccessToken(userId: string, role: UserRole): Promise<string> {
  return new SignJWT({ role, typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getAccessSecret());
}

export async function signRefreshToken(userId: string, sessionId: string): Promise<string> {
  return new SignJWT({ sid: sessionId, typ: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify<AccessTokenClaims>(token, getAccessSecret());
    if (payload.typ !== 'access' || !payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null> {
  try {
    const { payload } = await jwtVerify<RefreshTokenClaims>(token, getRefreshSecret());
    if (payload.typ !== 'refresh' || !payload.sub || !payload.sid) return null;
    return payload;
  } catch {
    return null;
  }
}
