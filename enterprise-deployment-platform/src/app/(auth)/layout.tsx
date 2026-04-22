import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2 text-spotify-green-400 font-bold text-lg tracking-tight">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="12" r="12" />
            <path
              d="M7 14.5c2.8-.7 5.7-.6 8.2.4M7.3 11.5c3.3-.9 6.7-.7 9.6.6M7.6 8.5c3.8-1 7.6-.8 10.9.8"
              stroke="#000"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          Tempo
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
