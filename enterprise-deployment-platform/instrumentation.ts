// Next.js 16 `instrumentation.ts` entry point. Runs once on server startup in
// both the Node and Edge runtimes. Used here to wire Sentry and to expose a
// tracer that the DRM hotspot (`canPlayTrack`) can use to record spans.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export { captureRequestError as onRequestError } from '@sentry/nextjs';
