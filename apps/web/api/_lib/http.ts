import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CookieSession, RakushifuError } from '@rakushifu/core';

// api/ 配下の _ で始まるパスは Vercel が関数として公開しない

/** フロントが X-Rakushifu-Cookies で渡した cookie 文字列。無い・長すぎるときは null */
export function readCookies(req: VercelRequest): string | null {
  const cookies = req.headers['x-rakushifu-cookies'];
  if (typeof cookies !== 'string' || cookies.length === 0 || cookies.length > 10000) {
    return null;
  }
  return cookies;
}

export function createSession(cookies = ''): CookieSession {
  return new CookieSession(fetch, cookies);
}

/**
 * クライアントの失敗を HTTP レスポンスに戻す。
 * RakushifuError の message は利用者に見せてよい文言だけなので、そのまま返す。
 * それ以外の例外は cookie などが混ざりうるため、中身を出さずに固定の文言にする。
 */
export function sendError(res: VercelResponse, error: unknown, logLabel: string) {
  if (!(error instanceof RakushifuError)) {
    console.error(logLabel);
    return res.status(500).json({ error: 'サーバーでエラーが発生しました' });
  }
  if (error.status >= 500) {
    // 例外の中身はログに残さない
    console.error(logLabel);
  }
  if (error.status === 422) {
    return res.status(422).json({ error: error.message, invalidDates: error.invalidDates ?? [] });
  }
  return res.status(error.status).json({ error: error.message });
}
