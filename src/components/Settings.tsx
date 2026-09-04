import { useState, useEffect } from 'react';
import { Settings2 } from 'lucide-react';
import type { SalarySettings } from '../types/shift';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Popover } from './ui/popover';

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

/** 空文字・負値・NaN を 0 に丸める。min="0" は form 送信時しか効かないため */
function toAmount(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <Popover
        open={open}
        onOpenChange={setOpen}
        label="給与設定" 
        trigger={
          <Button variant="outline" size="sm">
            <Settings2 aria-hidden="true" />
            給与設定
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hourlyRate">時給（円）</Label>
            <Input
              id="hourlyRate"
              type="number"
              inputMode="numeric"
              min="0"
              className="tabular"
              value={settings.hourlyRate}
              onChange={(e) => setSettings((s) => ({ ...s, hourlyRate: toAmount(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transportCost">交通費（円/日）</Label>
            <Input
              id="transportCost"
              type="number"
              inputMode="numeric"
              min="0"
              className="tabular"
              value={settings.transportCost}
              onChange={(e) =>
                setSettings((s) => ({ ...s, transportCost: toAmount(e.target.value) }))
              }
            />
          </div>
          <Button onClick={handleSave} size="sm" className="w-full">
            保存
          </Button>
        </div>
      </Popover>

      <p className="text-muted-foreground tabular text-xs">
        時給 {settings.hourlyRate.toLocaleString('ja-JP')}円 ・ 交通費{' '}
        {settings.transportCost.toLocaleString('ja-JP')}円/日
      </p>
    </div>
  );
}
