import { cn } from '@/lib/cn';

type AlbumCoverProps = {
  from: string;
  to: string;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'none' | 'sm' | 'md' | 'full';
  className?: string;
};

const sizes: Record<NonNullable<AlbumCoverProps['size']>, string> = {
  sm: 'h-10 w-10 text-xs',
  md: 'h-20 w-20 text-sm',
  lg: 'h-40 w-40 text-base',
  xl: 'h-56 w-56 md:h-64 md:w-64 text-lg',
};

const radii: Record<NonNullable<AlbumCoverProps['rounded']>, string> = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-card',
  full: 'rounded-full',
};

export function AlbumCover({
  from,
  to,
  title,
  size = 'md',
  rounded = 'md',
  className,
}: AlbumCoverProps) {
  const initials = title
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      role="img"
      aria-label={`${title} cover art`}
      className={cn(
        'flex items-center justify-center font-black text-white/90 shadow-md',
        sizes[size],
        radii[rounded],
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      }}
    >
      <span className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">{initials}</span>
    </div>
  );
}
