import { useState, useEffect } from 'react';
import { useOverlap } from '../hooks/useOverlap';
import type { OverlapEntry } from '../types/shift';

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatMin(min: number): string {
  const normalized = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface OverlapSectionProps {
  title: string;
  icon: string;
  accent: string;
  entries: OverlapEntry[];
}

function OverlapSection({ title, icon, accent, entries }: OverlapSectionProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
      <h3 className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
        <span className={`material-symbols-outlined ${accent}`}>{icon}</span>
        {title}
        <span className="text-sm font-normal text-gray-400">{entries.length}人</span>
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 py-2">かぶっている人はいません</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {entries.map((e, i) => (
            <li key={`${e.name}-${i}`} className="flex items-center justify-between gap-3 py-2.5">
              <span className="font-medium text-gray-800 truncate">{e.name}</span>
              <span className="flex flex-col items-end text-right shrink-0">
                <span className="text-sm text-gray-600">
                  {formatMin(e.startAsMin)}–{formatMin(e.endAsMin)}
                </span>
                <span className={`text-xs ${accent}`}>
                  かぶり {formatMin(e.overlapStartAsMin)}–{formatMin(e.overlapEndAsMin)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ShiftOverlapProps {
  onSessionExpired: () => void;
}

export function ShiftOverlap({ onSessionExpired }: ShiftOverlapProps) {
  const [date, setDate] = useState(todayString);
  const { result, loading, error, fetchOverlap } = useOverlap(onSessionExpired);

  useEffect(() => {
    fetchOverlap(date);
  }, [date, fetchOverlap]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
        <label htmlFor="overlap-date" className="block text-sm font-medium text-gray-700 mb-2">
          日付を選択
        </label>
        <input
          id="overlap-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        {result?.self && (
          <p className="mt-3 text-sm text-gray-600">
            自分のシフト:{' '}
            <span className="font-medium text-gray-800">
              {formatMin(result.self.startAsMin)}–{formatMin(result.self.endAsMin)}
            </span>
          </p>
        )}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
          <p className="mt-2 text-sm text-gray-500">シフトを取得中...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && result && !result.self && (
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center space-y-2">
          <span className="material-symbols-outlined text-4xl text-gray-300">event_busy</span>
          <p className="text-sm text-gray-500">この日は自分のシフトがありません</p>
        </div>
      )}

      {!loading && !error && result?.self && (
        <>
          <OverlapSection title="フロア" icon="restaurant" accent="text-blue-600" entries={result.floor} />
          <OverlapSection title="キッチン" icon="skillet" accent="text-orange-600" entries={result.kitchen} />
        </>
      )}
    </div>
  );
}
