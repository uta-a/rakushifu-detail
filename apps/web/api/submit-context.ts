import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRakushifuClient } from '@rakushifu/core';
import { createSession, readCookies, sendError } from './_lib/http.js';

/**
 * 希望シフト提出画面の初期コンテキストをまとめて返すプロキシ。
 * 起動時に揃って必要なので、ブラウザからの往復を1回に畳む。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = readCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'ログインしてください' });
  }

  try {
    const data = await createRakushifuClient(createSession(cookies)).getSubmitContext();
    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error, 'Fetch submit context error');
  }
}
