import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, ...props },
  ref,
) {
  return (
    <div className="flex flex-col gap-1">
      <input
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          'h-10 rounded-card bg-surface-elevated px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-transparent focus:border-spotify-green-400 transition-colors',
          error && 'border-accent-pink',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-accent-pink">{error}</span>}
    </div>
  );
});
