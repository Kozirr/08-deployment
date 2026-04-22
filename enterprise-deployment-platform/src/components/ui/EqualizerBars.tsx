import { cn } from '@/lib/cn';
import styles from './EqualizerBars.module.css';

type EqualizerBarsProps = {
  active?: boolean;
  className?: string;
  label?: string;
};

export function EqualizerBars({ active = true, className, label = 'Now playing' }: EqualizerBarsProps) {
  return (
    <div
      className={cn(styles.eq, !active && styles.paused, className)}
      role="img"
      aria-label={label}
    >
      <span className={styles.bar} />
      <span className={styles.bar} />
      <span className={styles.bar} />
      <span className={styles.bar} />
    </div>
  );
}
