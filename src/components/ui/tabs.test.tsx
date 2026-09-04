import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Tabs, type TabItem } from './tabs';

type Key = 'a' | 'b' | 'c';

const ITEMS: TabItem<Key>[] = [
  { value: 'a', label: 'あ' },
  { value: 'b', label: 'い' },
  { value: 'c', label: 'う' },
];

function Harness({ onChange }: { onChange?: (v: Key) => void }) {
  const [value, setValue] = useState<Key>('a');
  return (
    <Tabs
      items={ITEMS}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      idPrefix="t"
      label="テスト"
    />
  );
}

const tabs = () => screen.getAllByRole('tab');

afterEach(cleanup);

describe('Tabs', () => {
  it('選択中のタブだけが tabbable', () => {
    render(<Harness />);
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('aria-controls は表示中のパネルの id だけを指す', () => {
    render(<Harness />);
    expect(tabs()[0].getAttribute('aria-controls')).toBe('t-panel-a');
    expect(tabs()[1].getAttribute('aria-controls')).toBeNull();
  });

  it('矢印キーはフォーカスだけを動かし、選択は変えない（manual activation）', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    tabs()[0].focus();
    fireEvent.keyDown(tabs()[0], { key: 'ArrowRight' });

    expect(document.activeElement).toBe(tabs()[1]);
    expect(onChange).not.toHaveBeenCalled();
    expect(tabs()[0].getAttribute('aria-selected')).toBe('true');
    // roving tabindex もフォーカスに追従する
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
  });

  it('確定（クリック / Enter・Space によるボタン既定動作）で選択が移る', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    tabs()[0].focus();
    fireEvent.keyDown(tabs()[0], { key: 'ArrowRight' });
    fireEvent.click(tabs()[1]);

    expect(onChange).toHaveBeenCalledWith('b');
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
  });

  it('左端から ArrowLeft で末尾に折り返す', () => {
    render(<Harness />);

    tabs()[0].focus();
    fireEvent.keyDown(tabs()[0], { key: 'ArrowLeft' });

    expect(document.activeElement).toBe(tabs()[2]);
  });

  it('Home / End で両端へ移動する', () => {
    render(<Harness />);

    tabs()[0].focus();
    fireEvent.keyDown(tabs()[0], { key: 'End' });
    expect(document.activeElement).toBe(tabs()[2]);

    fireEvent.keyDown(tabs()[2], { key: 'Home' });
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it('リスト外へフォーカスが出たら、次は選択中のタブに戻る', () => {
    render(
      <>
        <Harness />
        <button type="button">外</button>
      </>
    );
    const outside = screen.getByRole('button', { name: '外' });

    tabs()[0].focus();
    fireEvent.keyDown(tabs()[0], { key: 'ArrowRight' });
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);

    fireEvent.blur(tabs()[1], { relatedTarget: outside });
    expect(tabs().map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });
});
