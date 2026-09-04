import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Popover } from './popover';
import { Button } from './button';

function Harness({ onTriggerClick }: { onTriggerClick?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Popover
        open={open}
        onOpenChange={setOpen}
        label="設定"
        trigger={<Button onClick={onTriggerClick}>開く</Button>}
      >
        <input aria-label="値" />
      </Popover>
      <button type="button">外</button>
    </>
  );
}

const trigger = () => screen.getByRole('button', { name: '開く' });
const panel = () => screen.queryByRole('dialog', { name: '設定' });

afterEach(cleanup);

describe('Popover', () => {
  it('トリガーで開閉し、中身の先頭にフォーカスが移る', () => {
    render(<Harness />);
    expect(panel()).toBeNull();

    fireEvent.click(trigger());

    expect(panel()).not.toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText('値'));
  });

  it('トリガー自身の onClick を握り潰さない', () => {
    const onTriggerClick = vi.fn();
    render(<Harness onTriggerClick={onTriggerClick} />);

    fireEvent.click(trigger());

    expect(onTriggerClick).toHaveBeenCalledOnce();
    expect(panel()).not.toBeNull();
  });

  it('Esc で閉じ、フォーカスがトリガーに戻る', () => {
    render(<Harness />);
    fireEvent.click(trigger());

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('外側の pointerdown で閉じる', () => {
    render(<Harness />);
    fireEvent.click(trigger());

    fireEvent.pointerDown(screen.getByRole('button', { name: '外' }));

    expect(panel()).toBeNull();
  });

  it('内側の pointerdown では閉じない', () => {
    render(<Harness />);
    fireEvent.click(trigger());

    fireEvent.pointerDown(screen.getByLabelText('値'));

    expect(panel()).not.toBeNull();
  });

  it('aria-expanded がトリガーに反映される', () => {
    render(<Harness />);
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger());

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });
});
