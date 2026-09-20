import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

const FOCUSABLE = 'input, button, select, textarea, [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ダイアログのアクセシブルネーム。見出しとしても描画する */
  title: string;
  /** 見出しの下に出す補足 */
  description?: string;
  children: ReactNode;
  /** 末尾のボタン行 */
  footer?: ReactNode;
  className?: string;
}

/**
 * ネイティブ `<dialog>` の showModal() を使うモーダル。
 * フォーカストラップと背面の不活性化、重なり順（top layer）をブラウザに任せられるので、
 * 自前のトラップを書かずに済み、z-index の段も増えない。
 *
 * ui/popover.tsx は absolute 配置でフォーカストラップも無いため、モーダルには使わない。
 *
 * 閉じているあいだは何も描画しない。jsdom は `<dialog>` の showModal/close を実装して
 * いないため、open 属性の付け外しで状態を持つと環境差が出てしまう。
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  // 開いたらモーダル化して中身にフォーカスを移し、閉じたら呼び出し元へ戻す。
  // onOpenChange を依存に含めないのは、再レンダリングのたびに showModal() を
  // 呼ぶと（すでに開いているダイアログでは例外になるため）壊れるから。
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;
    if (!el) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    // showModal 未実装の環境では open 属性だけ付けて描画する
    if (typeof el.showModal === 'function') {
      el.showModal();
    } else {
      el.setAttribute('open', '');
    }
    el.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    return () => {
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // ブラウザ側の閉じる動作を止め、閉じ方を onOpenChange に一本化する
      event.preventDefault();
      onOpenChange(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      // 背景（::backdrop）のクリックは dialog 自身がターゲットになる
      onClick={(event) => {
        if (event.target === dialogRef.current) onOpenChange(false);
      }}
      className={cn(
        'bg-card text-card-foreground m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border p-0 shadow-md',
        'backdrop:bg-foreground/50',
        className
      )}
    >
      <div className="space-y-4 p-4 sm:p-6">
        <div className="space-y-1">
          <h2 id={titleId} className="text-sm font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-muted-foreground text-xs">
              {description}
            </p>
          )}
        </div>

        {children}

        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </dialog>
  );
}
