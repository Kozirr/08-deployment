import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  children: ReactNode;
};

export function Card({ interactive, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card bg-surface p-4',
        interactive &&
          'cursor-pointer transition-all duration-[var(--duration-base)] ease-[var(--ease-spotify)] hover:bg-surface-hover hover:shadow-card-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
