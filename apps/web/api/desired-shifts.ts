import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRakushifuClient, DATE_PATTERN } from '@rakushifu/core';
import { createSession, readCookies, sendError } from './_lib/http.js';

/** 提出期間は半月単位だが、余裕を見て2ヶ月ぶんまで許す */
const MAX_RANGE_DAYS = 62;

/** 指定期間の提出済み希望シフトを返すプロキシ */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startDate = req.query.start_date;
  const endDate = req.query.end_date;

  if (
    typeof startDate !== 'string' ||
    typeof endDate !== 'string' ||
    !DATE_PATTERN.test(startDate) ||
    !DATE_PATTERN.test(endDate) ||
    startDate > endDate
  ) {
    return res
      .status(400)
      .json({ error: '有効な start_date と end_date (YYYY-MM-DD) を指定してください' });
  }

  const rangeDays = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000;
  if (!Number.isFinite(rangeDays) || rangeDays > MAX_RANGE_DAYS) {
    return res.status(400).json({ error: `期間は${MAX_RANGE_DAYS}日以内で指定してください` });
  }

  const cookies = readCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'ログインしてください' });
  }

  try {
    const data = await createRakushifuClient(createSession(cookies)).getDesiredShifts(startDate, endDate);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error, 'Fetch desired shifts error');
  }
}
