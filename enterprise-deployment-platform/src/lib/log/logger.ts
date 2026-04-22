import pino, { type Logger } from 'pino';

// Redaction paths cover the usual PII/credentials carriers. The `remove: true`
// flag strips them entirely instead of showing a `[Redacted]` placeholder, so
// there's no risk of log readers mistaking redacted output for empty values.
const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'headers.cookie',
  'headers.authorization',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.refreshToken',
  '*.accessToken',
  '*.secret',
];

const isDev = process.env.NODE_ENV === 'development';

export const logger: Logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: {
    service: 'tempo',
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    region: process.env.VERCEL_REGION ?? null,
  },
  redact: { paths: REDACT_PATHS, remove: true },
  // Pretty transport in dev; JSON lines in prod (Vercel log drains ingest JSON).
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' },
        },
      }
    : {}),
});

export function childLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
