'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const items = [
  { href: '/dashboard', label: 'Home' },
  { href: '/search', label: 'Search' },
  { href: '/library', label: 'Library' },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden sticky bottom-0 z-30 flex justify-around border-t border-border bg-spotify-gray-900 py-2">
      {items.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 text-center text-xs font-semibold py-1',
              active ? 'text-foreground' : 'text-muted',
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
