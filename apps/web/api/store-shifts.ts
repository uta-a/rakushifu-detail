import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRakushifuClient } from '@rakushifu/core';
import { createSession, readCookies, sendError } from './_lib/http.js';

/**
 * 店舗の指定日シフト（フロア/キッチン・出勤のみ）を、個人情報を絞って返すプロキシ。
 * 元の /ajax/admin/v2/schedules は年齢・生年月日等を含むため、name・職種・時刻だけに絞る。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const storeId = Number(req.query.store_id);
  const date = req.query.date;

  if (!Number.isInteger(storeId) || storeId < 1 || storeId > 9_999_999) {
    return res.status(400).json({ error: '有効な store_id を指定してください' });
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: '有効な date (YYYY-MM-DD) を指定してください' });
  }

  const cookies = readCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'ログインしてください' });
  }

  try {
    const data = await createRakushifuClient(createSession(cookies)).getStoreShifts(storeId, date);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error, 'Fetch store shifts error');
  }
}
