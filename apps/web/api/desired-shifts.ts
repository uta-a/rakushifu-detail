import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = 'https://skylark.enterprise.rakushifu.com';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** 提出期間は半月単位だが、余裕を見て2ヶ月ぶんまで許す */
const MAX_RANGE_DAYS = 62;

interface RawDesiredSchedule {
  id: number;
  date: string;
  attending_store_id: number;
  attending_genre_id: number;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  off: boolean;
  off_type: number;
  memo_text: string | null;
  fixed_shift_log_id: number | null;
}

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

  const cookies = req.headers['x-rakushifu-cookies'] as string;
  if (!cookies || cookies.length > 10000) {
    return res.status(401).json({ error: 'ログインしてください' });
  }

  try {
    const response = await fetch(
      `${BASE_URL}/typed/api/staff/desired_schedules?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: {
          Accept: 'application/json, text/plain, */*',
          Cookie: cookies,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: `${BASE_URL}/staff/v2/schedules/multiple_stores_submit`,
        },
      }
    );

    if (response.status === 401) {
      return res.status(401).json({ error: 'ログインしてください' });
    }
    if (!response.ok) {
      return res.status(response.status).json({ error: '希望シフトの取得に失敗しました' });
    }

    const data = await response.json();
    const results = data?.results as RawDesiredSchedule[] | undefined;
    if (!Array.isArray(results)) {
      return res.status(502).json({ error: '希望シフトの解析に失敗しました' });
    }

    // 上流は user_id や belonging_* も返すが、画面が使うフィールドだけに絞る
    return res.status(200).json({
      results: results.map((s) => ({
        id: s.id,
        date: s.date,
        attending_store_id: s.attending_store_id,
        attending_genre_id: s.attending_genre_id,
        start_hour: s.start_hour,
        start_minute: s.start_minute,
        end_hour: s.end_hour,
        end_minute: s.end_minute,
        off: s.off,
        off_type: s.off_type,
        memo_text: s.memo_text,
        fixed_shift_log_id: s.fixed_shift_log_id,
      })),
    });
  } catch {
    // cookie が混ざりうるので、例外の中身はログに残さない
    console.error('Fetch desired shifts error');
    return res.status(500).json({ error: '希望シフトの取得でエラーが発生しました' });
  }
}
