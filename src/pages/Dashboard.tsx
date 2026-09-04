import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useShifts } from '../hooks/useShifts';
import { Settings } from '../components/Settings';
import { ShiftTable } from '../components/ShiftTable';
import { SalarySummary } from '../components/SalarySummary';
import { MonthNav } from '../components/MonthNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Skeleton, SkeletonGroup } from '../components/ui/skeleton';
import { calcMonthlySalary } from '../utils/salaryCalculator';
import type { SalarySettings } from '../types/shift';

interface DashboardProps {
  onSessionExpired: () => void;
}

/** 取得中も高さを保ち、画面が跳ねないようにする */
function SalarySkeleton() {
  return (
    <SkeletonGroup label="シフトデータを取得中" className="space-y-5">
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-44" />
          </div>
          <Skeleton className="h-[4.5rem] w-full" />
          <div className="space-y-3 border-t pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>シフト一覧</CardTitle>
        </CardHeader>
        <CardContent padding="below-header" className="space-y-2.5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </CardContent>
      </Card>
    </SkeletonGroup>
  );
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
    <div className="space-y-5">
      <Settings onChange={handleSettingsChange} />

      <MonthNav as="h2" year={year} month={month} onPrev={handlePrevMonth} onNext={handleNextMonth} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !error && <SalarySkeleton />}

      {!loading && !error && (
        <>
          <SalarySummary result={salaryResult} />
          <Card>
            <CardHeader>
              <CardTitle>シフト一覧</CardTitle>
            </CardHeader>
            <CardContent padding="below-header">
              <ShiftTable shifts={salaryResult.shifts} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
