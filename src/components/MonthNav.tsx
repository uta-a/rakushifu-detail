import type { ElementType } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface MonthNavProps {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  /**
   * 年月を見出しとして出すかどうか。画面の主対象が「その月」なら h2 にする。
   * 表の caption など別に見出しがある場合は既定の p のままにする。
   */
  as?: Extract<ElementType, 'h2' | 'p'>;
}

/** カレンダーと給料計算で共有する月送り。両画面で見た目と操作を揃える */
export function MonthNav({
  year,
  month,
  onPrev,
  onNext,
  prevDisabled = false,
  nextDisabled = false,
  as: Tag = 'p',
}: MonthNavProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" size="icon" onClick={onPrev} disabled={prevDisabled} aria-label="前の月">
        <ChevronLeft aria-hidden="true" />
      </Button>

      <Tag className="tabular text-center leading-tight">
        <span className="text-muted-foreground block text-xs">{year}年</span>
        <span className="block text-xl font-semibold tracking-tight">{month}月</span>
      </Tag>

      <Button variant="ghost" size="icon" onClick={onNext} disabled={nextDisabled} aria-label="次の月">
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}
