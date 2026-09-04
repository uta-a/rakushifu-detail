import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'default' | 'destructive';

const VARIANTS: Record<Variant, string> = {
  default: 'bg-card text-card-foreground [&>svg]:text-muted-foreground',
  destructive: 'bg-card text-destructive [&>svg]:text-destructive',
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'relative grid w-full grid-cols-[auto_1fr] items-start gap-x-3 gap-y-1',
        'rounded-lg border px-4 py-3 text-sm',
        '[&>svg]:size-4 [&>svg]:translate-y-0.5',
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('col-start-2 font-medium', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('col-start-2 text-sm opacity-90', className)} {...props} />;
}
