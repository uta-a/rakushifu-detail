import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = 'https://skylark.enterprise.rakushifu.com';
const SUBMIT_PAGE = `${BASE_URL}/staff/v2/schedules/multiple_stores_submit`;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
/** 提出期間は半月単位。2ヶ月ぶんを上限にして、巨大なボディを上流へ中継しない */
const MAX_SHIFTS = 62;
const MAX_MEMO_LENGTH = 500;
/** 日跨ぎの終了時刻を許すため 24 時を超える値も受ける */
const MAX_HOUR = 47;
/** off_type は Default(0) 〜 PmOff(5) */
const MAX_OFF_TYPE = 5;
/** 上流が返す 422 の detail をそのまま出す際の上限 */
const MAX_DETAIL_LENGTH = 200;

interface DesiredScheduleInput {
  attending_store_id: number;
  attending_genre_id: number;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  off: boolean;
  off_type: number;
}

interface ShiftUpsertItem {
  date: string;
  memo_text: string | null;
  fixed_shift_log_id: number | null;
  desired_schedule: DesiredScheduleInput | null;
}

function extractCookies(headers: Headers): string[] {
  const cookies: string[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      cookies.push(value);
    }
  });
  return cookies;
}

function parseCookieValue(setCookieHeaders: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const header of setCookieHeaders) {
    const match = header.match(/^([^=]+)=([^;]*)/);
    if (match) {
      result[match[1].trim()] = match[2].trim();
    }
  }
  return result;
}

/** フロントから届いた "k=v; k=v" を名前→値に開く */
function parseCookieHeader(cookieString: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of cookieString.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    result[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return result;
}

function buildCookieString(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

/**
 * リクエストボディを検証し、上流へ送る形に組み直す。
 * req.body をそのまま中継すると任意の JSON をらくしふへ送れてしまうため、
 * 検証を通った値だけで新しいオブジェクトを作る（spread は使わない）。
 */
function sanitizeShifts(raw: unknown): { items: ShiftUpsertItem[] } | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_SHIFTS) {
    return { error: `提出する日数が不正です（1〜${MAX_SHIFTS}日）` };
  }

  const items: ShiftUpsertItem[] = [];
  const seen = new Set<string>();

  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      return { error: '提出内容が不正です' };
    }
    const shift = entry as Record<string, unknown>;

    const date = shift.date;
    if (typeof date !== 'string' || !DATE_PATTERN.test(date)) {
      return { error: '日付の形式が不正です' };
    }
    if (seen.has(date)) {
      return { error: `日付が重複しています: ${date}` };
    }
    seen.add(date);

    const memo = shift.memo_text ?? null;
    if (memo !== null && (typeof memo !== 'string' || memo.length > MAX_MEMO_LENGTH)) {
      return { error: `メモは${MAX_MEMO_LENGTH}文字以内で入力してください` };
    }

    const fixedShiftLogId = shift.fixed_shift_log_id ?? null;
    if (fixedShiftLogId !== null && !isIntInRange(fixedShiftLogId, 1, 9_999_999_999)) {
      return { error: '確定シフトの指定が不正です' };
    }

    const desired = shift.desired_schedule ?? null;

    // 確定済みの日を書き換えるリクエストは、UI で弾いていてもサーバー側で拒否する
    if (fixedShiftLogId !== null && desired !== null) {
      return { error: '確定済みの日は変更できません' };
    }

    if (desired === null) {
      items.push({ date, memo_text: memo, fixed_shift_log_id: fixedShiftLogId, desired_schedule: null });
      continue;
    }
    if (typeof desired !== 'object') {
      return { error: '希望内容が不正です' };
    }
    const d = desired as Record<string, unknown>;

    if (!isIntInRange(d.attending_store_id, 1, 9_999_999)) {
      return { error: '勤務店舗が不正です' };
    }
    if (!isIntInRange(d.attending_genre_id, 0, 9_999_999)) {
      return { error: '職種が不正です' };
    }
    if (!isIntInRange(d.start_hour, 0, MAX_HOUR) || !isIntInRange(d.end_hour, 0, MAX_HOUR)) {
      return { error: '時刻（時）が不正です' };
    }
    if (!isIntInRange(d.start_minute, 0, 59) || !isIntInRange(d.end_minute, 0, 59)) {
      return { error: '時刻（分）が不正です' };
    }
    if (typeof d.off !== 'boolean') {
      return { error: '休み希望の指定が不正です' };
    }
    if (!isIntInRange(d.off_type, 0, MAX_OFF_TYPE)) {
      return { error: '休みの種別が不正です' };
    }

    items.push({
      date,
      memo_text: memo,
      fixed_shift_log_id: null,
      desired_schedule: {
        attending_store_id: d.attending_store_id,
        attending_genre_id: d.attending_genre_id,
        start_hour: d.start_hour,
        start_minute: d.start_minute,
        end_hour: d.end_hour,
        end_minute: d.end_minute,
        off: d.off,
        off_type: d.off_type,
      },
    });
  }

  return { items };
}

/**
 * 希望シフトを提出（upsert）するプロキシ。
 *
 * らくしふの更新系は Rails の CSRF 保護下にあり、提出ページの HTML に埋め込まれた
 * data-csrf-token を X-CSRF-Token で送る必要がある。トークンはセッションと対なので、
 * HTML 取得時に返ってきた _Rakushifu_session に差し替えてから POST する。
 *
 * upsert は指定した期間を丸ごと置き換える。送らなかった日は消えるのではなく、
 * 呼び出し側が期間内の全日付を送る前提の API なので、items の欠けはそのまま
 * データの欠けになる点に注意すること。
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = req.headers['x-rakushifu-cookies'] as string;
  if (!cookies || cookies.length > 10000) {
    return res.status(401).json({ error: 'ログインしてください' });
  }

  const sanitized = sanitizeShifts(req.body?.shifts);
  if ('error' in sanitized) {
    return res.status(400).json({ error: sanitized.error });
  }

  const commonHeaders = {
    Cookie: cookies,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Referer: SUBMIT_PAGE,
  };

  try {
    // 1. 提出ページの HTML から CSRF トークンを取る
    const pageRes = await fetch(SUBMIT_PAGE, {
      headers: { ...commonHeaders, Accept: 'text/html,application/xhtml+xml' },
      redirect: 'manual',
    });
    if (pageRes.status === 401 || (pageRes.status >= 300 && pageRes.status < 400)) {
      return res.status(401).json({ error: 'ログインしてください' });
    }
    if (!pageRes.ok) {
      return res.status(502).json({ error: '提出ページの取得に失敗しました' });
    }

    // 属性の並び順に依存しないよう、タグを取ってから値を取る2段構え
    const html = await pageRes.text();
    const tag = html.match(/<[^>]*\bid="csrf-token"[^>]*>/)?.[0];
    const token = tag?.match(/data-csrf-token="([^"]+)"/)?.[1];
    if (!token || !/^[A-Za-z0-9+/=_-]{40,200}$/.test(token)) {
      // らくしふ側の HTML 構造が変わった可能性が高いので、他の失敗と文言を分ける
      return res.status(502).json({ error: '提出トークンの取得に失敗しました' });
    }

    // 2. HTML 取得で回転したセッション cookie に差し替える。
    //    トークンはこのセッションと対でしか通らない。
    const refreshed = parseCookieValue(
      pageRes.headers.getSetCookie?.() ?? extractCookies(pageRes.headers)
    );
    const mergedCookies = buildCookieString({ ...parseCookieHeader(cookies), ...refreshed });

    // 3. 検証済みの値だけで組み直したボディを送る
    const upsertRes = await fetch(`${BASE_URL}/typed/api/staff/schedules/upsert`, {
      method: 'POST',
      headers: {
        ...commonHeaders,
        Accept: 'application/json, text/plain, */*',
        Cookie: mergedCookies,
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
        'Xbit-Accept-Language': 'ja',
        'Xbit-Device-Type': 'web',
        Origin: BASE_URL,
      },
      body: JSON.stringify({ shifts: sanitized.items }),
    });

    if (upsertRes.status === 401) {
      return res.status(401).json({ error: 'ログインしてください' });
    }
    if (upsertRes.status === 422) {
      const detail = await upsertRes.json().catch(() => null);
      // 上流の内部情報が混ざりうるので、素性のはっきりした短い文字列だけ通す
      const message =
        typeof detail?.detail === 'string' && detail.detail.length <= MAX_DETAIL_LENGTH
          ? detail.detail
          : '入力内容に誤りがあります';
      const invalidDates = (Array.isArray(detail?.invalid_params) ? detail.invalid_params : [])
        .map((p: unknown) => (p as { name?: unknown })?.name)
        .filter((name: unknown): name is string => typeof name === 'string' && DATE_PATTERN.test(name))
        .slice(0, MAX_SHIFTS);
      return res.status(422).json({ error: message, invalidDates });
    }
    if (!upsertRes.ok) {
      return res.status(502).json({ error: 'シフトの提出に失敗しました' });
    }

    // 上流のボディは返さない（提出できたかどうかだけが必要）
    return res.status(200).json({ success: true, count: sanitized.items.length });
  } catch {
    // cookie や提出ページの HTML が混ざりうるので、例外の中身はログに残さない
    console.error('Submit shifts error');
    return res.status(500).json({ error: 'シフトの提出でエラーが発生しました' });
  }
}
