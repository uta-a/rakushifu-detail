import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/** 取得中に高さを保つためのプレースホルダ。スピナーの代わりに使う */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('bg-muted animate-pulse rounded-md', className)} {...props} />;
}

/**
 * Skeleton の集まりを包み、支援技術に取得中であることを伝える。
 * Skeleton 自体は空の div なので、これが無いと読み上げが完全に無音になる。
 */
export function SkeletonGroup({
  label,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { label: string }) {
  return (
    <div aria-busy="true" className={className} {...props}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
