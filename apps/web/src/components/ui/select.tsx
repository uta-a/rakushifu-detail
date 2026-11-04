import type { ComponentProps } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * ネイティブ `<select>` を Input と同じ見た目に揃えたもの。
 * 選択肢が確定している入力（時刻など）に使う。モバイルでは OS のピッカーが出る。
 *
 * 面は Input の `--input-background` ではなく `--popover` を使う。ブラウザは開いた一覧の
 * 背景に select 自身の background-color を使うため、ダークの半透明な白（6%）のままだと
 * 一覧が白く潰れて文字が読めなくなる。popover は開いた一覧そのものが「浮いている面」で
 * あることとも合っていて、閉じている状態の見た目は Input とほぼ変わらない
 * （ライトは同じ白、ダークは card に6%白を重ねた色とほぼ同値）。
 * option 側にも明示するのは、一覧の行を自前で塗るブラウザがあるため。
 */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'flex h-11 w-full min-w-0 appearance-none rounded-md border border-input',
          'bg-popover text-popover-foreground',
          'py-1 pr-8 pl-3 text-base',
          'transition-[color,box-shadow] duration-150 ease-out',
          'outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
          '[&>option]:bg-popover [&>option]:text-popover-foreground',
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
