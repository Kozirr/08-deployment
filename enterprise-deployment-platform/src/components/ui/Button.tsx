import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'icon' | 'link';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  isLoading?: boolean;
};

const base =
  'inline-flex items-center justify-center gap-2 font-semibold tracking-wide rounded-pill transition-transform duration-[var(--duration-base)] ease-[var(--ease-spotify)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spotify-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed select-none';

const variants: Record<Variant, string> = {
  primary:
    'bg-spotify-green-400 text-black hover:bg-spotify-green-300 hover:scale-[1.04] active:scale-[0.98] shadow-sm',
  secondary:
    'border border-muted text-foreground hover:border-foreground hover:scale-[1.04] active:scale-[0.98] bg-transparent',
  ghost: 'text-muted hover:text-foreground hover:bg-surface-hover',
  icon: 'rounded-full text-muted hover:text-foreground hover:bg-surface-hover p-2',
  link: 'text-muted hover:text-foreground underline-offset-4 hover:underline p-0 rounded-none',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-4 text-xs',
  md: 'h-10 px-6 text-sm',
  lg: 'h-12 px-8 text-base',
};

const iconSizes: Record<Size, string> = {
  sm: 'h-8 w-8 p-0',
  md: 'h-10 w-10 p-0',
  lg: 'h-12 w-12 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    iconLeft,
    iconRight,
    isLoading,
    disabled,
    children,
    ...props
  },
  ref,
) {
  const sizing = variant === 'icon' ? iconSizes[size] : sizes[size];
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizing, className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
});
