import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Dialog } from './dialog';
import { Button } from './button';

function Harness({ onApply }: { onApply?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>開く</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="一括入力"
        description="対象の曜日をえらぶ"
        footer={<Button onClick={onApply}>適用</Button>}
      >
        <input aria-label="開始" />
      </Dialog>
    </>
  );
}

const trigger = () => screen.getByRole('button', { name: '開く' });
const dialog = () => screen.queryByRole('dialog', { name: '一括入力' });

afterEach(cleanup);

describe('Dialog', () => {
  it('閉じているあいだは何も描画しない', () => {
    render(<Harness />);
    expect(dialog()).toBeNull();
  });

  it('開くと中身の先頭にフォーカスが移る', () => {
    render(<Harness />);
    fireEvent.click(trigger());

    expect(dialog()).not.toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText('開始'));
  });

  it('補足文がアクセシブルな説明として結び付く', () => {
    render(<Harness />);
    fireEvent.click(trigger());

    const described = dialog()?.getAttribute('aria-describedby');
    expect(described).toBeTruthy();
    expect(document.getElementById(described as string)?.textContent).toBe('対象の曜日をえらぶ');
  });

  it('Esc で閉じ、開く前にフォーカスされていた要素に戻る', () => {
    render(<Harness />);
    // jsdom の click はフォーカスを動かさないので、実ブラウザの挙動に合わせる
    trigger().focus();
    fireEvent.click(trigger());

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('背景のクリックで閉じる', () => {
    render(<Harness />);
    fireEvent.click(trigger());

    fireEvent.click(dialog() as HTMLElement);

    expect(dialog()).toBeNull();
  });

  it('中身のクリックでは閉じない', () => {
    render(<Harness />);
    fireEvent.click(trigger());

    fireEvent.click(screen.getByLabelText('開始'));

    expect(dialog()).not.toBeNull();
  });

  it('フッターのボタンの onClick を握り潰さない', () => {
    const onApply = vi.fn();
    render(<Harness onApply={onApply} />);
    fireEvent.click(trigger());

    fireEvent.click(screen.getByRole('button', { name: '適用' }));

    expect(onApply).toHaveBeenCalledTimes(1);
  });
});
