import type { ComponentProps } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * ネイティブ `<select>` を Input と同じ見た目に揃えたもの。
 * 選択肢が確定している入力（時刻など）に使う。モバイルでは OS のピッカーが出る。
 */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'flex h-11 w-full min-w-0 appearance-none rounded-md border border-input bg-input-background',
          'py-1 pr-8 pl-3 text-base',
          'transition-[color,box-shadow] duration-150 ease-out',
          'outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
          'sm:text-sm',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2"
      />
    </div>
  );
}
