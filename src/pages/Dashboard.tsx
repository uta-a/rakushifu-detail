import { useState, useEffect, useCallback, useMemo } from 'react';
import { useShifts } from '../hooks/useShifts';
import { Settings } from '../components/Settings';
import { ShiftTable } from '../components/ShiftTable';
import { SalarySummary } from '../components/SalarySummary';
import { calcMonthlySalary } from '../utils/salaryCalculator';
import type { SalarySettings } from '../types/shift';

interface DashboardProps {
  onSessionExpired: () => void;
}

export function Dashboard({ onSessionExpired }: DashboardProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [settings, setSettings] = useState<SalarySettings>({ hourlyRate: 1200, transportCost: 0 });
  const { schedules, loading, error, fetchShifts } = useShifts(onSessionExpired);

  useEffect(() => {
    fetchShifts(year, month);
  }, [year, month, fetchShifts]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleSettingsChange = useCallback((s: SalarySettings) => {
    setSettings(s);
  }, []);

  const salaryResult = useMemo(
    () => calcMonthlySalary(schedules, settings),
    [schedules, settings]
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <Settings onChange={handleSettingsChange} />

      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={handlePrevMonth}
          aria-label="前の月"
          className="flex items-center justify-center h-11 w-11 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <h2 className="text-lg font-bold text-gray-800 min-w-32 text-center">
          {year}年{month}月
        </h2>
        <button
          type="button"
          onClick={handleNextMonth}
          aria-label="次の月"
          className="flex items-center justify-center h-11 w-11 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
          <p className="mt-2 text-sm text-gray-500">シフトデータを取得中...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <SalarySummary result={salaryResult} />
          <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">シフト一覧</h2>
            <ShiftTable shifts={salaryResult.shifts} />
          </div>
        </>
      )}
    </div>
  );
}
