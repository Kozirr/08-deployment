/**
 * Global SWR fetcher with transparent 401 → refresh → retry.
 * Always sends credentials so the HTTP-only `sp_at` cookie is attached.
 */

export class FetchError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: string };

let refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // allow next refresh after this settles
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();
  return refreshInFlight;
}

/** Low-level fetch that returns the parsed JSON envelope or throws FetchError. */
export async function apiFetch<T = unknown>(
  input: string,
  init: RequestInit = {},
  { retry = true }: { retry?: boolean } = {},
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch<T>(input, init, { retry: false });
  }

  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    // fallthrough — some endpoints return no body
  }

  if (!res.ok || !body || body.ok === false) {
    const msg = body && body.ok === false ? body.error : `Request failed (${res.status})`;
    throw new FetchError(res.status, body, msg);
  }
  return body.data;
}

/** SWR-compatible fetcher: `useSWR(key, fetcher)`. */
export const fetcher = <T = unknown>(url: string) => apiFetch<T>(url);
