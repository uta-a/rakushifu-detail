import {
  cloneElement,
  useEffect,
  useRef,
  type ComponentProps,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/cn';

interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * クリックで開閉するボタン。ref と aria 属性をここで注入するため、
   * props をそのまま DOM の <button> に展開するコンポーネントを渡すこと
   * （ui/button.tsx の Button はこれを満たす）。
   */
  trigger: ReactElement<ComponentProps<'button'>>;
  /** ポップオーバー自身のアクセシブルネーム */
  label: string;
  children: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

/**
 * Esc・外側クリックで閉じ、閉じたらトリガーにフォーカスを戻す軽量ポップオーバー。
 * 通常フローを押し下げないよう absolute で重ねる。
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  label,
  children,
  align = 'start',
  className,
}: PopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    /** 閉じる直前に中にフォーカスがあったら、トリガーへ戻す */
    const close = () => {
      const insideFocus =
        document.activeElement instanceof Node &&
        rootRef.current?.contains(document.activeElement);
      onOpenChange(false);
      if (insideFocus) triggerRef.current?.focus();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      close();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onOpenChange]);

  // 開いたら中身の先頭にフォーカスを移す
  useEffect(() => {
    if (!open) return;
    contentRef.current
      ?.querySelector<HTMLElement>(
        'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      ?.focus();
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {cloneElement(trigger, {
        ref: triggerRef,
        'aria-expanded': open,
        'aria-haspopup': 'dialog',
        // トリガー自身の onClick を握り潰さない
        onClick: (event: MouseEvent<HTMLButtonElement>) => {
          trigger.props.onClick?.(event);
          onOpenChange(!open);
        },
      })}

      {open && (
        <div
          ref={contentRef}
          role="dialog"
          aria-label={label}
          className={cn(
            'bg-popover text-popover-foreground absolute top-[calc(100%+0.5rem)] z-20',
            'w-72 max-w-[calc(100vw-2rem)] rounded-lg border p-4 shadow-md',
            align === 'end' ? 'right-0' : 'left-0',
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
