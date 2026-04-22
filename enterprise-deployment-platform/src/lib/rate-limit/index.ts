import { buildLimiter, type Limiter } from './upstash';

// Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set;
// in-memory token bucket otherwise (dev, CI).
export const authLimiter: Limiter = buildLimiter('auth', 10, 60);
export const globalLimiter: Limiter = buildLimiter('global', 120, 60);
export const writeLimiter: Limiter = buildLimiter('write', 30, 60);
