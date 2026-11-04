import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface UnsavedChangesValue {
  /** シフト管理タブに未提出の変更があるか */
  submitDirty: boolean;
  setSubmitDirty(dirty: boolean): void;
}

const UnsavedChangesContext = createContext<UnsavedChangesValue | null>(null);

/**
 * 未提出の変更の有無をタブの外（タブバー・ログアウト）へ伝える。
 *
 * Web版はタブを移るとシフト管理がアンマウントされて編集内容が消えるため、タブ移動を
 * 引き止めている。Android のタブは移っても画面が残る（編集内容も残る）ので引き止めず、
 * タブに印を出すだけにする。内容が本当に消えるログアウトだけを確認ダイアログで引き止める。
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [submitDirty, setSubmitDirty] = useState(false);
  return (
    <UnsavedChangesContext.Provider value={{ submitDirty, setSubmitDirty }}>{children}</UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges(): UnsavedChangesValue {
  const value = useContext(UnsavedChangesContext);
  if (!value) throw new Error('useUnsavedChanges は UnsavedChangesProvider の内側で使うこと');
  return value;
}

/** シフト管理画面から dirty を報告する。画面が外れたら（ログアウトなど）未変更に戻す */
export function useReportSubmitDirty(dirty: boolean) {
  const { setSubmitDirty } = useUnsavedChanges();
  useEffect(() => {
    setSubmitDirty(dirty);
  }, [dirty, setSubmitDirty]);
  useEffect(() => () => setSubmitDirty(false), [setSubmitDirty]);
}
