import { buildLimiter, type Limiter } from './upstash';

// Three named limiters preserving the original call signature. Upstash Redis is
// used when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set; otherwise
// the in-memory token bucket from the dev days is used as a fallback for local
// runs and CI builds that don't need distributed state.

// 10 requests / min for auth endpoints
export const authLimiter: Limiter = buildLimiter('auth', 10, 60);

// 120 requests / min global
export const globalLimiter: Limiter = buildLimiter('global', 120, 60);

// 30 writes / min for mutations
export const writeLimiter: Limiter = buildLimiter('write', 30, 60);
