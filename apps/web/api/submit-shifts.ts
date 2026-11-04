import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRakushifuClient } from '@rakushifu/core';
import { createSession, readCookies, sendError } from './_lib/http.js';

/**
 * 希望シフトを提出（upsert）するプロキシ。
 *
 * CSRF トークンの取得、回転したセッション cookie への差し替え、提出内容の検証
 * （許可キーだけを詰め替える sanitizeShifts）はクライアント側で行う。
 * upsert は期間を丸ごと置き換えるので、フロントは期間内の全日付を送ること。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = readCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'ログインしてください' });
  }

  try {
    const result = await createRakushifuClient(createSession(cookies)).submitShifts(req.body?.shifts);
    return res.status(200).json(result);
  } catch (error) {
    return sendError(res, error, 'Submit shifts error');
  }
}
