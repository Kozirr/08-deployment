import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { UnauthorizedError } from '@/lib/auth/current-user';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class PaymentRequiredError extends ApiError {
  constructor(message = 'Premium subscription required') {
    super(message, 402, 'PAYMENT_REQUIRED');
    this.name = 'PaymentRequiredError';
  }
}

export class RateLimitedError extends ApiError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
    this.name = 'RateLimitedError';
  }
}

type ApiSuccess<T> = { ok: true; data: T };
type ApiFailure = { ok: false; error: { message: string; code?: string; fields?: Record<string, string> } };
export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json<ApiEnvelope<T>>({ ok: true, data }, init);
}

export function fail(
  message: string,
  status: number,
  extra?: { code?: string; fields?: Record<string, string> },
): NextResponse {
  return NextResponse.json<ApiEnvelope<never>>(
    { ok: false, error: { message, ...extra } },
    { status },
  );
}

function formatZodError(err: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of err.issues) {
    const path = issue.path.join('.') || '_';
    if (!fields[path]) fields[path] = issue.message;
  }
  return fields;
}

/** Wraps a route handler so thrown errors render as JSON envelopes. */
export function handleRoute<T extends (...args: never[]) => Promise<NextResponse>>(fn: T): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ZodError) {
        return fail('Invalid input', 400, {
          code: 'VALIDATION_ERROR',
          fields: formatZodError(err),
        });
      }
      if (err instanceof UnauthorizedError) {
        return fail(err.message, 401, { code: 'UNAUTHORIZED' });
      }
      if (err instanceof ApiError) {
        return fail(err.message, err.status, { code: err.code });
      }
      console.error('[api] unhandled error:', err);
      return fail('Internal server error', 500, { code: 'INTERNAL' });
    }
  }) as T;
}
