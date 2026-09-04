import type { ComponentProps, ElementType, HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/** 面の言語はこれ一つ。border + bg-card + rounded-lg で統一し、影は使わない */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('bg-card text-card-foreground rounded-lg border', className)} {...props} />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-2 px-4 pt-4 sm:px-6 sm:pt-6', className)} {...props} />
  );
}

interface CardTitleProps extends ComponentProps<'h2'> {
  /** 見出しレベル。ページ内の階層に合わせて呼び出し側が決める */
  as?: Extract<ElementType, 'h2' | 'h3'>;
}

export function CardTitle({ className, as: Tag = 'h2', ...props }: CardTitleProps) {
  return (
    <Tag
      className={cn('text-sm font-semibold tracking-tight text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * パディングは className ではなく padding プロップで選ぶ。
 * cn() は単純結合で tailwind-merge を通さないため、className に p-* を渡しても
 * 生成CSS の並び順（`sm:p-6` が後）に負けて効かない。
 */
type Padding = 'default' | 'below-header' | 'none';

const PADDING: Record<Padding, string> = {
  default: 'p-4 sm:p-6',
  /** CardHeader の直後に置く場合。上だけ詰める */
  'below-header': 'px-4 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-6',
  /** 呼び出し側で余白を決める場合 */
  none: '',
};

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  padding?: Padding;
}

export function CardContent({ className, padding = 'default', ...props }: CardContentProps) {
  return <div className={cn(PADDING[padding], className)} {...props} />;
}
