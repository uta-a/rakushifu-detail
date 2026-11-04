// 初回描画前にテーマを当ててちらつきを消す。
// CSP の default-src 'self' でインラインは禁止だが、同一オリジンの外部JSは許可される。
// src/lib/theme.ts の applyTheme / readStoredTheme と同じ動作にすること。
(function () {
  try {
    var t = localStorage.getItem('rakushifu-theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.classList.add(t);
    }
  } catch (e) {
    // localStorage が使えない環境では OS 設定（index.css の @media）に任せる
  }
})();
