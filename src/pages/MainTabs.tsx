import { useState } from 'react';
import { CalendarDays, ClipboardList, Wallet } from 'lucide-react';
import { ShiftCalendar } from './ShiftCalendar';
import { Dashboard } from './Dashboard';
import { ShiftSubmit } from './ShiftSubmit';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { TabPanel, Tabs, type TabItem } from '../components/ui/tabs';

type TabKey = 'calendar' | 'salary' | 'submit';

const TAB_PREFIX = 'main';

const TABS: TabItem<TabKey>[] = [
  { value: 'calendar', label: 'カレンダー', icon: <CalendarDays aria-hidden="true" /> },
  { value: 'salary', label: '給与計算', icon: <Wallet aria-hidden="true" /> },
  { value: 'submit', label: 'シフト管理', icon: <ClipboardList aria-hidden="true" /> },
];

interface MainTabsProps {
  onSessionExpired: () => void;
}

export function MainTabs({ onSessionExpired }: MainTabsProps) {
  const [active, setActive] = useState<TabKey>('calendar');
  /** シフト管理タブの未提出の変更。タブを移るとアンマウントで失われるので引き止める */
  const [submitDirty, setSubmitDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabKey | null>(null);

  const handleTabChange = (next: TabKey) => {
    if (active === 'submit' && submitDirty && next !== 'submit') {
      setPendingTab(next);
      return;
    }
    setActive(next);
  };

  const leavePendingTab = () => {
    if (!pendingTab) return;
    setSubmitDirty(false);
    setActive(pendingTab);
    setPendingTab(null);
  };

  return (
    <div className="bg-background min-h-screen">
      <header className="bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 pt-3 pb-2">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h1 className="text-base font-semibold tracking-tight">らくしふツール</h1>
            <ThemeToggle />
          </div>
          <Tabs
            items={TABS}
            value={active}
            onValueChange={handleTabChange}
            idPrefix={TAB_PREFIX}
            label="機能切り替え"
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:py-6">
        <TabPanel idPrefix={TAB_PREFIX} value={active}>
          {active === 'calendar' && <ShiftCalendar onSessionExpired={onSessionExpired} />}
          {active === 'salary' && <Dashboard onSessionExpired={onSessionExpired} />}
          {active === 'submit' && (
            <ShiftSubmit onSessionExpired={onSessionExpired} onDirtyChange={setSubmitDirty} />
          )}
        </TabPanel>
      </main>

      <Dialog
        open={pendingTab !== null}
        onOpenChange={(open) => {
          if (!open) setPendingTab(null);
        }}
        title="変更を破棄しますか？"
        description="シフト管理タブに、まだ提出していない変更があります。"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setPendingTab(null)}>
              編集に戻る
            </Button>
            <Button variant="destructive" size="sm" onClick={leavePendingTab}>
              破棄して移動
            </Button>
          </>
        }
      >
        <p className="text-muted-foreground text-sm">タブを移ると、入力した内容は失われます。</p>
      </Dialog>
    </div>
  );
}
