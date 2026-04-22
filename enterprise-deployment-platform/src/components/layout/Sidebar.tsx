'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlaylists } from '@/lib/hooks/usePlaylists';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { cn } from '@/lib/cn';

const primaryNav = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon },
  { href: '/search', label: 'Search', icon: SearchIcon },
  { href: '/library', label: 'Your Library', icon: LibraryIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const { playlists, isLoading } = usePlaylists();

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-black text-muted p-2 gap-2">
      <nav className="bg-surface rounded-card p-3">
        <ul className="flex flex-col gap-1">
          {primaryNav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-card px-3 py-2 text-sm font-semibold',
                    active ? 'text-foreground' : 'text-muted hover:text-foreground',
                  )}
                >
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex-1 bg-surface rounded-card p-3 overflow-hidden flex flex-col">
        <header className="flex items-center justify-between px-2 pb-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Your Library</h2>
          {user && (
            <Link
              href="/playlists/new"
              aria-label="Create playlist"
              className="text-muted hover:text-foreground"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
              </svg>
            </Link>
          )}
        </header>
        {!user ? (
          <p className="px-2 text-xs text-muted">
            <Link href="/login" className="underline hover:text-foreground">
              Log in
            </Link>{' '}
            to see your playlists.
          </p>
        ) : isLoading ? (
          <p className="px-2 text-xs text-muted">Loading…</p>
        ) : playlists.length === 0 ? (
          <p className="px-2 text-xs text-muted">No playlists yet.</p>
        ) : (
          <ul className="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-spotify">
            {playlists.map((p) => {
              const active = pathname === `/playlists/${p.id}`;
              return (
                <li key={p.id}>
                  <Link
                    href={`/playlists/${p.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-card px-2 py-2 text-sm',
                      active
                        ? 'bg-surface-hover text-foreground'
                        : 'text-muted hover:text-foreground hover:bg-surface-hover',
                    )}
                  >
                    <span
                      className="w-10 h-10 rounded-sm shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${p.coverFromColor}, ${p.coverToColor})`,
                      }}
                      aria-hidden
                    />
                    <span className="flex flex-col min-w-0">
                      <span className="truncate font-semibold text-foreground">{p.title}</span>
                      <span className="truncate text-xs">Playlist • {p.ownerName}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M15.5 14h-.79l-.28-.27A6.5 6.5 0 1 0 13 15.5l.27.28v.79l4.25 4.25 1.49-1.5-4.26-4.26zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM13 9V3.5L18.5 9H13z" />
    </svg>
  );
}
