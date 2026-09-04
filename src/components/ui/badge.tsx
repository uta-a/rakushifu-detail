import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'default' | 'secondary' | 'outline';

const VARIANTS: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  /** 文字色は親から継承する。text-* を className で足すと衝突するため */
  outline: 'border',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = 'secondary', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}
