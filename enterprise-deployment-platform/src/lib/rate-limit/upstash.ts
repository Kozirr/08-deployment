import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type ConsumeResult = { allowed: boolean; remaining: number; retryAfterSec: number };

export interface Limiter {
  consume(key: string, cost?: number): Promise<ConsumeResult>;
}

function buildUpstash(name: string, limit: number, windowSec: number): Limiter {
  const redis = Redis.fromEnv();
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(limit, `${windowSec} s`, limit),
    analytics: false,
    prefix: `rl:${name}`,
  });
  return {
    async consume(key: string): Promise<ConsumeResult> {
      const r = await rl.limit(key);
      const retryAfterSec = r.success ? 0 : Math.max(1, Math.ceil((r.reset - Date.now()) / 1000));
      return { allowed: r.success, remaining: r.remaining, retryAfterSec };
    },
  };
}

export function buildLimiter(name: string, limit: number, windowSec: number): Limiter {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return buildUpstash(name, limit, windowSec);
  }
  return buildInMemory(limit, windowSec);
}

// Single-process fallback for dev, CI, and local parity testing.
type Bucket = { tokens: number; lastRefillMs: number };
function buildInMemory(capacity: number, windowSec: number): Limiter {
  const refillPerSec = capacity / windowSec;
  const maxEntries = 10_000;
  const buckets = new Map<string, Bucket>();

  return {
    async consume(key: string, cost = 1): Promise<ConsumeResult> {
      const now = Date.now();
      let bucket = buckets.get(key);
      if (!bucket) {
        if (buckets.size >= maxEntries) {
          const oldestKey = buckets.keys().next().value;
          if (oldestKey) buckets.delete(oldestKey);
        }
        bucket = { tokens: capacity, lastRefillMs: now };
        buckets.set(key, bucket);
      }
      const elapsedSec = (now - bucket.lastRefillMs) / 1000;
      bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSec * refillPerSec);
      bucket.lastRefillMs = now;
      if (bucket.tokens < cost) {
        const retryAfterSec = Math.ceil((cost - bucket.tokens) / refillPerSec);
        return { allowed: false, remaining: Math.floor(bucket.tokens), retryAfterSec };
      }
      bucket.tokens -= cost;
      return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterSec: 0 };
    },
  };
}
