import { useState, useEffect } from 'react';
import type { SalarySettings } from '../types/shift';

const STORAGE_KEY = 'salary-settings';

const defaultSettings: SalarySettings = {
  hourlyRate: 1200,
  transportCost: 0,
};

function loadSettings(): SalarySettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const hourlyRate = Number(parsed?.hourlyRate);
      const transportCost = Number(parsed?.transportCost);
      if (
        Number.isFinite(hourlyRate) && hourlyRate >= 0 &&
        Number.isFinite(transportCost) && transportCost >= 0
      ) {
        return { hourlyRate, transportCost };
      }
    }
  } catch {
    // ignore
  }
  return defaultSettings;
}

interface SettingsProps {
  onChange: (settings: SalarySettings) => void;
}

export function Settings({ onChange }: SettingsProps) {
  const [settings, setSettings] = useState<SalarySettings>(loadSettings);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onChange(settings);
  }, [settings, onChange]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setOpen(false);
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
      >
        <span className="material-symbols-outlined text-lg">settings</span>
        給与設定
        <span className="text-xs text-gray-500">
          ({settings.hourlyRate}円/h, 交通費{settings.transportCost}円/日)
        </span>
      </button>

      {open && (
        <div className="mt-2 p-4 bg-white rounded-xl shadow-lg border border-gray-200 max-w-sm">
          <div className="space-y-3">
            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                時給 (円)
              </label>
              <input
                id="hourlyRate"
                type="number"
                min="0"
                value={settings.hourlyRate}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, hourlyRate: Number(e.target.value) }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label htmlFor="transportCost" className="block text-sm font-medium text-gray-700 mb-1">
                交通費 (円/日)
              </label>
              <input
                id="transportCost"
                type="number"
                min="0"
                value={settings.transportCost}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, transportCost: Number(e.target.value) }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              onClick={handleSave}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
