import { useState } from 'react';
import { CalendarDays, Users, Wallet } from 'lucide-react';
import { ShiftCalendar } from './ShiftCalendar';
import { ShiftOverlap } from './ShiftOverlap';
import { Dashboard } from './Dashboard';
import { ShiftSubmit } from './ShiftSubmit';
import { ThemeToggle } from '../components/ThemeToggle';
import { TabPanel, Tabs, type TabItem } from '../components/ui/tabs';

type TabKey = 'calendar' | 'overlap' | 'salary';

/** ルーターは持たず、提出画面はタブバーごと差し替える */
type View = 'tabs' | 'submit';

const TAB_PREFIX = 'main';

const TABS: TabItem<TabKey>[] = [
  { value: 'calendar', label: 'カレンダー', icon: <CalendarDays aria-hidden="true" /> },
  { value: 'overlap', label: 'シフトかぶり', icon: <Users aria-hidden="true" /> },
  { value: 'salary', label: '給料計算', icon: <Wallet aria-hidden="true" /> },
];

interface MainTabsProps {
  onSessionExpired: () => void;
}

export function MainTabs({ onSessionExpired }: MainTabsProps) {
  const [active, setActive] = useState<TabKey>('calendar');
  const [view, setView] = useState<View>('tabs');

  if (view === 'submit') {
    // タブ側は丸ごとアンマウントされるので、戻ったときにカレンダーが再取得され、
    // 提出した内容がそのまま反映される
    return <ShiftSubmit onBack={() => setView('tabs')} onSessionExpired={onSessionExpired} />;
  }

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
            onValueChange={setActive}
            idPrefix={TAB_PREFIX}
            label="機能切り替え"
          />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:py-6">
        <TabPanel idPrefix={TAB_PREFIX} value={active}>
          {active === 'calendar' && (
            <ShiftCalendar
              onSessionExpired={onSessionExpired}
              onOpenSubmit={() => setView('submit')}
            />
          )}
          {active === 'overlap' && <ShiftOverlap onSessionExpired={onSessionExpired} />}
          {active === 'salary' && <Dashboard onSessionExpired={onSessionExpired} />}
        </TabPanel>
      </main>
    </div>
  );
}
