import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'default' | 'sm' | 'lg' | 'icon';

const VARIANTS: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
};

const SIZES: Record<Size, string> = {
  default: 'h-11 px-4 text-sm gap-2',
  sm: 'h-9 px-3 text-sm gap-1.5',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-11 w-11 shrink-0',
};

const BASE =
  'inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap ' +
  'transition-colors duration-150 ease-out ' +
  'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    />
  );
}
