import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = 'https://skylark.enterprise.rakushifu.com';

// この店舗で扱う職種(genre)。フロア=2, キッチン=3。
const GENRE_IDS = [2, 3];

interface SharedSchedule {
  user_id: number;
  attending_genre_id: number;
  start_as_min: number | null;
  end_as_min: number | null;
  off: boolean;
}

interface StoreUser {
  id: number;
  name: string;
}

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

  const cookies = req.headers['x-rakushifu-cookies'] as string;
  if (!cookies || cookies.length > 10000) {
    return res.status(401).json({ error: 'ログインしてください' });
  }

  const commonHeaders = {
    Accept: 'application/json, text/plain, */*',
    Cookie: cookies,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Referer: `${BASE_URL}/staff/v2/schedules/confirmed`,
  };

  try {
    // 1. 自分の user_id を取得
    const orgRes = await fetch(`${BASE_URL}/ajax/organizations`, { headers: commonHeaders });
    if (orgRes.status === 401) {
      return res.status(401).json({ error: 'ログインしてください' });
    }
    if (!orgRes.ok) {
      return res.status(orgRes.status).json({ error: 'ユーザー情報の取得に失敗しました' });
    }
    const org = await orgRes.json();
    const selfUserId = org?.current_user?.id;
    if (typeof selfUserId !== 'number') {
      return res.status(502).json({ error: 'ユーザー情報の解析に失敗しました' });
    }

    // 2. 店舗の指定日シフトを取得
    const genreQuery = GENRE_IDS.map((g) => `genre_ids[]=${g}`).join('&');
    const url =
      `${BASE_URL}/ajax/admin/v2/schedules?page_ctx_name=staff&store_id=${storeId}` +
      `&${genreQuery}&start_date=${date}&end_date=${date}&is_staff_print_page=false`;
    const shiftRes = await fetch(url, { headers: commonHeaders });
    if (shiftRes.status === 401) {
      return res.status(401).json({ error: 'ログインしてください' });
    }
    if (!shiftRes.ok) {
      return res.status(shiftRes.status).json({ error: 'シフトデータの取得に失敗しました' });
    }
    const data = await shiftRes.json();

    const nameById = new Map<number, string>(
      (data.users as StoreUser[] | undefined)?.map((u) => [u.id, u.name]) ?? []
    );

    // 出勤・フロア/キッチン・時刻ありのシフトだけを、個人情報を落として抽出
    const members = ((data.shared as SharedSchedule[] | undefined) ?? [])
      .filter(
        (s) =>
          !s.off &&
          GENRE_IDS.includes(s.attending_genre_id) &&
          typeof s.start_as_min === 'number' &&
          typeof s.end_as_min === 'number' &&
          nameById.has(s.user_id)
      )
      .map((s) => ({
        userId: s.user_id,
        name: nameById.get(s.user_id)!,
        genreId: s.attending_genre_id,
        startAsMin: s.start_as_min as number,
        endAsMin: s.end_as_min as number,
      }));

    return res.status(200).json({ selfUserId, date, members });
  } catch {
    return res.status(500).json({ error: 'シフトデータの取得でエラーが発生しました' });
  }
}
