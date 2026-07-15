import { useState } from 'react';
import { Dashboard } from './Dashboard';
import { ShiftOverlap } from './ShiftOverlap';

type TabKey = 'salary' | 'overlap';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'salary', label: '給料計算', icon: 'payments' },
  { key: 'overlap', label: 'シフトかぶり', icon: 'groups' },
];

interface MainTabsProps {
  onSessionExpired: () => void;
}

export function MainTabs({ onSessionExpired }: MainTabsProps) {
  const [active, setActive] = useState<TabKey>('salary');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">らくしふツール</h1>
          <div className="flex mt-3" role="tablist" aria-label="機能切り替え">
            {TABS.map((tab) => {
              const selected = active === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActive(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 min-h-11 py-3 text-sm font-medium border-b-2 transition-colors ${
                    selected
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 sm:py-6">
        {active === 'salary' ? (
          <Dashboard onSessionExpired={onSessionExpired} />
        ) : (
          <ShiftOverlap onSessionExpired={onSessionExpired} />
        )}
      </main>
    </div>
  );
}
