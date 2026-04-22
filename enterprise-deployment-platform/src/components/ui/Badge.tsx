import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'neutral' | 'green' | 'violet' | 'blue';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  children: ReactNode;
};

const tones: Record<Tone, string> = {
  neutral: 'bg-surface-elevated text-foreground',
  green: 'bg-spotify-green-900/40 text-spotify-green-300',
  violet: 'bg-accent-violet/20 text-accent-violet',
  blue: 'bg-accent-blue/20 text-accent-blue',
};

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill px-3 py-1 text-xs font-semibold uppercase tracking-wider',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
