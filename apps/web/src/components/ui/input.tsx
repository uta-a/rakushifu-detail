import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'flex h-11 w-full min-w-0 rounded-md border border-input bg-input-background px-3 py-1 text-base',
        'transition-[color,box-shadow] duration-150 ease-out',
        'placeholder:text-muted-foreground',
        'outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        'sm:text-sm',
        className
      )}
      {...props}
    />
  );
}
