import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = 'https://skylark.enterprise.rakushifu.com';

// 提出画面が起動時に必要とする参照情報。公式画面も同じ5本を並列で叩いている。
const PATHS = [
  '/typed/api/staff/user_submit_terms',
  '/typed/api/staff/desired_schedule_submittable_stores',
  '/typed/api/staff/basic_shifts/me',
  '/typed/api/staff/user_acceptable_working_times',
  '/typed/api/staff/desired_off_limit',
  // 所属職種（attending_genre_id）を取るためだけに叩く
  '/ajax/organizations',
] as const;

interface RawSubmitTerm {
  user_id: number;
  store_id: number;
  start_date: string;
  end_date: string;
  submit_end_at: string;
  submitted: boolean;
}

interface RawStore {
  id: number;
  name: string;
  short_name: string;
  interval_minute: number;
  min_hour: number;
  max_hour: number;
  submittable_start_date: string;
  enabled_genre_ids: number[];
}

interface RawWeekdayTime {
  weekday: number;
  attending_store_id?: number;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  off: boolean;
}

/**
 * 希望シフト提出画面の初期コンテキストをまとめて返すプロキシ。
 * 5本とも起動時に揃って必要なので、ブラウザからの往復を1回に畳む。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = req.headers['x-rakushifu-cookies'] as string;
  if (!cookies || cookies.length > 10000) {
    return res.status(401).json({ error: 'ログインしてください' });
  }

  const commonHeaders = {
    Accept: 'application/json, text/plain, */*',
    Cookie: cookies,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Referer: `${BASE_URL}/staff/v2/schedules/multiple_stores_submit`,
  };

  try {
    const responses = await Promise.all(
      PATHS.map((path) => fetch(`${BASE_URL}${path}`, { headers: commonHeaders }))
    );

    if (responses.some((r) => r.status === 401)) {
      return res.status(401).json({ error: 'ログインしてください' });
    }
    const failed = responses.find((r) => !r.ok);
    if (failed) {
      return res.status(failed.status).json({ error: '提出情報の取得に失敗しました' });
    }

    const [termsJson, storesJson, basicJson, acceptableJson, offLimitJson, orgJson] =
      await Promise.all(responses.map((r) => r.json()));

    const rawTerms = termsJson?.results as RawSubmitTerm[] | undefined;
    const rawStores = storesJson?.results as RawStore[] | undefined;
    const rawBasic = basicJson?.results as RawWeekdayTime[] | undefined;
    const rawAcceptable = acceptableJson?.results as RawWeekdayTime[] | undefined;
    const rawOffLimit = offLimitJson?.desired_off_limit;

    if (!Array.isArray(rawTerms) || !Array.isArray(rawStores) || !Array.isArray(rawBasic)) {
      return res.status(502).json({ error: '提出情報の解析に失敗しました' });
    }

    // 上流のレスポンスをそのまま返さず、画面が使うフィールドだけに絞る
    // （/ajax/organizations は氏名やメールも含むので、職種だけを取り出す）
    return res.status(200).json({
      currentGenreId:
        typeof orgJson?.current_user?.current_belong_genre_id === 'number'
          ? orgJson.current_user.current_belong_genre_id
          : 0,
      terms: rawTerms.map((t) => ({
        user_id: t.user_id,
        store_id: t.store_id,
        start_date: t.start_date,
        end_date: t.end_date,
        submit_end_at: t.submit_end_at,
        submitted: t.submitted,
      })),
      stores: rawStores.map((s) => ({
        id: s.id,
        name: s.name,
        short_name: s.short_name,
        interval_minute: s.interval_minute,
        min_hour: s.min_hour,
        max_hour: s.max_hour,
        submittable_start_date: s.submittable_start_date,
        enabled_genre_ids: s.enabled_genre_ids ?? [],
      })),
      basicShifts: rawBasic.map((b) => ({
        weekday: b.weekday,
        attending_store_id: b.attending_store_id ?? 0,
        start_hour: b.start_hour,
        start_minute: b.start_minute,
        end_hour: b.end_hour,
        end_minute: b.end_minute,
        off: b.off,
      })),
      acceptableTimes: (Array.isArray(rawAcceptable) ? rawAcceptable : []).map((a) => ({
        weekday: a.weekday,
        start_hour: a.start_hour,
        start_minute: a.start_minute,
        end_hour: a.end_hour,
        end_minute: a.end_minute,
        off: a.off,
      })),
      offLimit: {
        has_limit: rawOffLimit?.has_limit === true,
        max_count: typeof rawOffLimit?.max_count === 'number' ? rawOffLimit.max_count : null,
      },
    });
  } catch {
    // cookie が混ざりうるので、例外の中身はログに残さない
    console.error('Fetch submit context error');
    return res.status(500).json({ error: '提出情報の取得でエラーが発生しました' });
  }
}
