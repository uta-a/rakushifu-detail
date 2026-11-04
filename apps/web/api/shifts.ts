import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRakushifuClient } from '@rakushifu/core';
import { createSession, readCookies, sendError } from './_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const y = Number(req.query.year);
  const m = Number(req.query.month);
  if (!Number.isInteger(y) || !Number.isInteger(m) || y < 2000 || y > 2100 || m < 1 || m > 12) {
    return res.status(400).json({ error: '有効な year (2000-2100) と month (1-12) を指定してください' });
  }

  const cookies = readCookies(req);
  if (!cookies) {
    return res.status(401).json({ error: 'ログインしてください' });
  }

  try {
    const data = await createRakushifuClient(createSession(cookies)).getConfirmedShifts(y, m);
    return res.status(200).json(data);
  } catch (error) {
    return sendError(res, error, 'Fetch shifts error');
  }
}
