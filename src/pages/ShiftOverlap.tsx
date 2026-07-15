/**
 * シフトかぶり表示タブ。
 * 日付を指定して、自分のシフト時間と重なるメンバーをフロア・キッチン別に表示する。
 * 他メンバーのシフト取得APIの確定後に実装するため、現状はプレースホルダ。
 */
export function ShiftOverlap() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center space-y-3">
      <span className="material-symbols-outlined text-5xl text-gray-300">groups</span>
      <h2 className="text-lg font-bold text-gray-800">シフトかぶり表示</h2>
      <p className="text-sm text-gray-500 leading-relaxed">
        日付を指定して、自分のシフト時間と重なるメンバーを
        <br className="hidden sm:block" />
        フロア・キッチン別に表示する機能です。
      </p>
      <p className="text-xs text-gray-400">準備中です</p>
    </div>
  );
}
