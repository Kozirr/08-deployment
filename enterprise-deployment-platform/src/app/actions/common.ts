import { ZodError } from 'zod';

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function actionError(err: unknown): ActionResult<never> {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.') || '_';
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors };
  }
  if (err instanceof Error) return { ok: false, error: err.message };
  return { ok: false, error: 'Unexpected error' };
}
