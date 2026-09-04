import { useRef, type KeyboardEvent } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import type { Theme } from '../lib/theme';
import { cn } from '../lib/cn';

const OPTIONS: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'ライト', Icon: Sun },
  { value: 'dark', label: 'ダーク', Icon: Moon },
  { value: 'system', label: 'OS設定', Icon: Monitor },
];

/**
 * radiogroup の作法に合わせ、フォーカスは1つだけ受け（roving tabindex）、
 * 矢印キーで移動と同時に選択する（APG の radiogroup は automatic activation）。
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const groupRef = useRef<HTMLDivElement>(null);

  const moveTo = (index: number) => {
    const next = OPTIONS[(index + OPTIONS.length) % OPTIONS.length].value;
    setTheme(next);
    groupRef.current
      ?.querySelector<HTMLButtonElement>(`[data-theme-value="${next}"]`)
      ?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = OPTIONS.findIndex((o) => o.value === theme);
    const moves: Record<string, () => void> = {
      ArrowRight: () => moveTo(current + 1),
      ArrowDown: () => moveTo(current + 1),
      ArrowLeft: () => moveTo(current - 1),
      ArrowUp: () => moveTo(current - 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="配色テーマ"
      onKeyDown={handleKeyDown}
      className="bg-muted inline-flex items-center gap-0.5 rounded-full p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            data-theme-value={value}
            aria-checked={selected}
            aria-label={label}
            title={label}
            tabIndex={selected ? 0 : -1}
            onClick={() => setTheme(value)}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-full',
              'transition-colors duration-150 ease-out',
              'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              selected
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
