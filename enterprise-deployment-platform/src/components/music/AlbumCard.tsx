'use client';

import Link from 'next/link';
import { AlbumCover } from './AlbumCover';
import styles from './AlbumCard.module.css';
import { cn } from '@/lib/cn';

type AlbumCardProps = {
  href: string;
  title: string;
  subtitle: string;
  from: string;
  to: string;
  className?: string;
};

export function AlbumCard({ href, title, subtitle, from, to, className }: AlbumCardProps) {
  return (
    <Link href={href} className={cn(styles.card, className)}>
      <div className={styles.coverWrap}>
        <AlbumCover from={from} to={to} title={title} size="lg" rounded="md" className="w-full h-auto aspect-square" />
        <button
          type="button"
          className={styles.playFab}
          aria-label={`Play ${title}`}
          onClick={(e) => {
            e.preventDefault();
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
      <div className={styles.meta}>
        <p className={styles.title}>{title}</p>
        <p className={styles.subtitle}>{subtitle}</p>
      </div>
    </Link>
  );
}
