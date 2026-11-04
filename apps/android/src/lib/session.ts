import type { RakushifuSession, SessionRequestInit, SessionResponse } from '@rakushifu/core';

/**
 * 端末の cookie jar（Android は OkHttp）に cookie を任せるセッション。
 *
 * - cookie を名前で読めない前提なので getCookie は実装しない。ログインの成否は
 *   クライアントが /ajax/organizations の応答で判定する
 * - RN の fetch では redirect: 'manual' が効かないため、リダイレクトは自動で追われる。
 *   セッション切れは最終 URL（Response.url）でクライアントが判定する
 *
 * 未検証（実機で確かめること）:
 * - api.accounts 側で発行された xbit_at が enterprise 側へのリクエストに載るか
 *   （cookie の Domain 次第。Web版はサーバーで手で載せ替えている）
 * - 302 の途中で返る Set-Cookie が jar に保存されるか
 * - Response.url がリダイレクト後の最終 URL になるか
 */
export class NativeJarSession implements RakushifuSession {
  async request(url: string, init: SessionRequestInit = {}): Promise<SessionResponse> {
    const res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: init.headers,
      body: init.body,
      credentials: 'include',
    });
    return {
      status: res.status,
      ok: res.ok,
      url: res.url || url,
      text: () => res.text(),
    };
  }
}
