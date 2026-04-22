'use client';

import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'sds-contrast-more';

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb);
  window.addEventListener('sds-contrast-change', cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener('sds-contrast-change', cb);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

function getServerSnapshot() {
  return false;
}

export function ContrastToggle() {
  const contrastMore = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('contrast-more', contrastMore);
  }

  const toggle = () => {
    const next = !contrastMore;
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    window.dispatchEvent(new Event('sds-contrast-change'));
  };

  return (
    <Button
      variant="icon"
      size="sm"
      aria-label={contrastMore ? 'Disable high contrast' : 'Enable high contrast'}
      aria-pressed={contrastMore}
      onClick={toggle}
      suppressHydrationWarning
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18V4c4.41 0 8 3.59 8 8s-3.59 8-8 8z" />
      </svg>
    </Button>
  );
}
