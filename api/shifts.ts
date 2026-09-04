import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = 'https://skylark.enterprise.rakushifu.com';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { year, month } = req.query;
  const y = Number(year);
  const m = Number(month);

  if (!Number.isInteger(y) || !Number.isInteger(m) || y < 2000 || y > 2100 || m < 1 || m > 12) {
    return res.status(400).json({ error: '有効な year (2000-2100) と month (1-12) を指定してください' });
  }

  const cookies = req.headers['x-rakushifu-cookies'] as string;
  if (!cookies || cookies.length > 10000) {
    return res.status(401).json({ error: 'ログインしてください' });
  }
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  try {
    const response = await fetch(
      `${BASE_URL}/ajax/staff/v2/schedules/confirmed/me?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: {
          Accept: 'application/json, text/plain, */*',
          Cookie: cookies,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: `${BASE_URL}/staff/v2/schedules/confirmed/me`,
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'シフトデータの取得に失敗しました' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch {
    // cookie が混ざりうるので、例外の中身はログに残さない
    console.error('Fetch shifts error');
    return res.status(500).json({ error: 'シフトデータの取得でエラーが発生しました' });
  }
}
