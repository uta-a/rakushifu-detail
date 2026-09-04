import { useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { panelId, tabId } from '../../lib/tab-ids';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** tab と tabpanel の id を紐付けるための接頭辞 */
  idPrefix: string;
  label: string;
  className?: string;
}

/**
 * shadcn 系の segmented control。
 *
 * WAI-ARIA APG の manual activation を採る。パネルの中身はタブ切り替えのたびに
 * API を叩くため、矢印キーで通過しただけで取得が走る automatic activation は使わない。
 * 矢印・Home/End はフォーカスのみを移し、Enter / Space / クリックで確定する。
 */
export function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  idPrefix,
  label,
  className,
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // manual activation なので、フォーカス位置は選択と独立に動く。
  // リスト外にフォーカスが出たら null に戻し、次に Tab で入ったときは選択中のタブに乗せる。
  const [focusedOverride, setFocusedOverride] = useState<T | null>(null);
  const focused = focusedOverride ?? value;

  const focusAt = (index: number) => {
    const wrapped = (index + items.length) % items.length;
    setFocusedOverride(items[wrapped].value);
    buttonRefs.current[wrapped]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = items.findIndex((item) => item.value === focused);
    const moves: Record<string, () => void> = {
      ArrowRight: () => focusAt(current + 1),
      ArrowLeft: () => focusAt(current - 1),
      Home: () => focusAt(0),
      End: () => focusAt(items.length - 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (listRef.current?.contains(event.relatedTarget)) return;
    setFocusedOverride(null);
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={cn(
        'bg-muted text-muted-foreground inline-flex w-full items-center rounded-lg p-1',
        className
      )}
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            id={tabId(idPrefix, item.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            // 表示中のパネルは1枚だけなので、実在する id だけを指す
            aria-controls={selected ? panelId(idPrefix, item.value) : undefined}
            tabIndex={item.value === focused ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            onFocus={() => setFocusedOverride(item.value)}
            className={cn(
              'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md px-2',
              'text-xs font-medium whitespace-nowrap sm:text-sm',
              'transition-colors duration-150 ease-out',
              'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              '[&_svg]:size-4 [&_svg]:shrink-0',
              selected ? 'bg-background text-foreground shadow-xs' : 'hover:text-foreground'
            )}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  idPrefix: string;
  value: string;
  children: ReactNode;
}

export function TabPanel({ idPrefix, value, children }: TabPanelProps) {
  return (
    <div role="tabpanel" id={panelId(idPrefix, value)} aria-labelledby={tabId(idPrefix, value)}>
      {children}
    </div>
  );
}
