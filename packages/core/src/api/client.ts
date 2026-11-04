import type {
  DesiredSchedule,
  ShiftApiResponse,
  StoreShiftMember,
  StoreShiftsResponse,
  SubmitContextResponse,
} from '../types/shift.ts';
import { RakushifuError } from './errors.ts';
import { DATE_PATTERN, MAX_SHIFTS, sanitizeShifts } from './sanitize.ts';
import type { RakushifuSession, SessionResponse } from './session.ts';

const AUTH_API = 'https://api.accounts.rakushifu.com';
const ENTERPRISE_CODE = 'skylark';
const BASE_URL = 'https://skylark.enterprise.rakushifu.com';
const SUBMIT_PAGE_PATH = '/staff/v2/schedules/multiple_stores_submit';
const SUBMIT_PAGE = `${BASE_URL}${SUBMIT_PAGE_PATH}`;

/** らくしふはブラウザ以外からのアクセスを想定していないので、ブラウザに見せる */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ACCEPT_JSON = 'application/json, text/plain, */*';

// この店舗で扱う職種(genre)。フロア=2, キッチン=3。
const GENRE_IDS = [2, 3];

/** 上流が返す 422 の detail をそのまま出す際の上限 */
const MAX_DETAIL_LENGTH = 200;

const UNAUTHORIZED = 'ログインしてください';

// 提出画面が起動時に必要とする参照情報。公式画面も同じ5本を並列で叩いている。
const SUBMIT_CONTEXT_PATHS = [
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

interface RawSharedSchedule {
  user_id: number;
  attending_genre_id: number;
  start_as_min: number | null;
  end_as_min: number | null;
  off: boolean;
}

interface RawStoreUser {
  id: number;
  name: string;
}

export interface RakushifuClient {
  /** 成功するとセッションに認証済みの cookie が残る */
  login(employeeCode: string, password: string): Promise<void>;
  getConfirmedShifts(year: number, month: number): Promise<ShiftApiResponse>;
  /** 店舗の指定日シフト（フロア/キッチン・出勤のみ）を、名前・職種・時刻だけに絞って返す */
  getStoreShifts(storeId: number, date: string): Promise<StoreShiftsResponse>;
  getSubmitContext(): Promise<SubmitContextResponse>;
  getDesiredShifts(startDate: string, endDate: string): Promise<{ results: DesiredSchedule[] }>;
  /**
   * 希望シフトを提出（upsert）する。期間を丸ごと置き換えるので、期間内の全日付を渡すこと。
   * 渡された値は sanitizeShifts で検証し、通った値だけで組み直して送る。
   */
  submitShifts(shifts: unknown): Promise<{ success: true; count: number }>;
}

/** URL からパスだけを取り出す（core は URL クラスの型に依存しないため文字列で処理する） */
function pathOf(url: string): string {
  return url.replace(/^[a-z]+:\/\/[^/]+/i, '').split(/[?#]/)[0];
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

async function readJson(res: SessionResponse): Promise<unknown> {
  return JSON.parse(await res.text());
}

/**
 * 想定外の例外（通信断、JSON の解析失敗など）を、利用者に見せてよい文言の
 * RakushifuError に置き換える。例外の中身には cookie や HTML が混ざりうるので捨てる。
 */
async function guard<T>(fallbackMessage: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof RakushifuError) throw error;
    throw new RakushifuError(500, fallbackMessage);
  }
}

/**
 * らくしふへの手順をまとめたクライアント。Web版（Vercel Functions）と Android版で共有する。
 * cookie とリダイレクトの扱いは session に任せる。
 */
export function createRakushifuClient(session: RakushifuSession): RakushifuClient {
  const jsonHeaders = (referer: string): Record<string, string> => ({
    Accept: ACCEPT_JSON,
    'User-Agent': USER_AGENT,
    Referer: referer,
  });

  /** JSON API の共通チェック。401 とリダイレクト（ログイン画面送り）はセッション切れに揃える */
  const ensureAuthorized = (res: SessionResponse) => {
    if (res.status === 401 || isRedirect(res.status)) {
      throw new RakushifuError(401, UNAUTHORIZED);
    }
  };

  return {
    login: (employeeCode, password) =>
      guard('ログイン処理でエラーが発生しました', async () => {
        // Step 1: ログインAPIを呼び出し（xbit_at 等の cookie が返る）
        const loginRes = await session.request(`${AUTH_API}/sign_in_with_employee_code/browser`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enterprise_code: ENTERPRISE_CODE,
            employee_code: employeeCode,
            password,
          }),
        });
        if (!loginRes.ok && loginRes.status !== 302) {
          throw new RakushifuError(401, 'ログインに失敗しました');
        }
        if (session.getCookie && !session.getCookie('xbit_at')) {
          throw new RakushifuError(401, '認証トークンの取得に失敗しました');
        }

        // Step 2: enterprise 側のセッション確立
        await session.request(
          `${BASE_URL}/authenticated_users?role=staff&enterprise_code=${ENTERPRISE_CODE}`,
        );

        // cookie を名前で読めないセッションは、認証が要る API が通るかで成否を判定する
        if (!session.getCookie) {
          const check = await session.request(`${BASE_URL}/ajax/organizations`, {
            headers: jsonHeaders(`${BASE_URL}/staff/v2/schedules/confirmed/me`),
          });
          if (check.status !== 200) {
            throw new RakushifuError(401, '認証トークンの取得に失敗しました');
          }
        }
      }),

    getConfirmedShifts: (year, month) =>
      guard('シフトデータの取得でエラーが発生しました', async () => {
        const mm = String(month).padStart(2, '0');
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${year}-${mm}-01`;
        const endDate = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;

        const res = await session.request(
          `${BASE_URL}/ajax/staff/v2/schedules/confirmed/me?start_date=${startDate}&end_date=${endDate}`,
          { headers: jsonHeaders(`${BASE_URL}/staff/v2/schedules/confirmed/me`) },
        );
        ensureAuthorized(res);
        if (!res.ok) {
          throw new RakushifuError(res.status, 'シフトデータの取得に失敗しました');
        }
        return (await readJson(res)) as ShiftApiResponse;
      }),

    getStoreShifts: (storeId, date) =>
      guard('シフトデータの取得でエラーが発生しました', async () => {
        const headers = jsonHeaders(`${BASE_URL}/staff/v2/schedules/confirmed`);
        const genreQuery = GENRE_IDS.map((g) => `genre_ids[]=${g}`).join('&');
        const shiftUrl =
          `${BASE_URL}/ajax/admin/v2/schedules?page_ctx_name=staff&store_id=${storeId}` +
          `&${genreQuery}&start_date=${date}&end_date=${date}&is_staff_print_page=false`;

        // 自分の user_id と店舗の指定日シフトは互いに依存しないので同時に取る。
        // 直列にすると日付を選ぶたびに往復が倍になり、体感がそのまま遅くなる。
        const [orgRes, shiftRes] = await Promise.all([
          session.request(`${BASE_URL}/ajax/organizations`, { headers }),
          session.request(shiftUrl, { headers }),
        ]);
        ensureAuthorized(orgRes);
        ensureAuthorized(shiftRes);
        if (!orgRes.ok) {
          throw new RakushifuError(orgRes.status, 'ユーザー情報の取得に失敗しました');
        }
        if (!shiftRes.ok) {
          throw new RakushifuError(shiftRes.status, 'シフトデータの取得に失敗しました');
        }

        const [org, data] = (await Promise.all([readJson(orgRes), readJson(shiftRes)])) as [
          { current_user?: { id?: unknown } } | null,
          { users?: RawStoreUser[]; shared?: RawSharedSchedule[] } | null,
        ];
        const selfUserId = org?.current_user?.id;
        if (typeof selfUserId !== 'number') {
          throw new RakushifuError(502, 'ユーザー情報の解析に失敗しました');
        }

        // 元のレスポンスは年齢・生年月日等を含むため、名前・職種・時刻だけに絞る
        const nameById = new Map<number, string>(data?.users?.map((u) => [u.id, u.name]) ?? []);
        const members: StoreShiftMember[] = (data?.shared ?? [])
          .filter(
            (s) =>
              !s.off &&
              GENRE_IDS.includes(s.attending_genre_id) &&
              typeof s.start_as_min === 'number' &&
              typeof s.end_as_min === 'number' &&
              nameById.has(s.user_id),
          )
          .map((s) => ({
            userId: s.user_id,
            name: nameById.get(s.user_id)!,
            genreId: s.attending_genre_id,
            startAsMin: s.start_as_min as number,
            endAsMin: s.end_as_min as number,
          }));

        return { selfUserId, date, members };
      }),

    getSubmitContext: () =>
      guard('提出情報の取得でエラーが発生しました', async () => {
        const headers = jsonHeaders(SUBMIT_PAGE);
        const responses = await Promise.all(
          SUBMIT_CONTEXT_PATHS.map((path) => session.request(`${BASE_URL}${path}`, { headers })),
        );
        responses.forEach(ensureAuthorized);
        const failed = responses.find((r) => !r.ok);
        if (failed) {
          throw new RakushifuError(failed.status, '提出情報の取得に失敗しました');
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 上流の JSON は形が保証されないので、ここで1つずつ確かめる
        const [termsJson, storesJson, basicJson, acceptableJson, offLimitJson, orgJson] = (await Promise.all(responses.map(readJson))) as any[];

        const rawTerms = termsJson?.results as RawSubmitTerm[] | undefined;
        const rawStores = storesJson?.results as RawStore[] | undefined;
        const rawBasic = basicJson?.results as RawWeekdayTime[] | undefined;
        const rawAcceptable = acceptableJson?.results as RawWeekdayTime[] | undefined;
        const rawOffLimit = offLimitJson?.desired_off_limit;

        if (!Array.isArray(rawTerms) || !Array.isArray(rawStores) || !Array.isArray(rawBasic)) {
          throw new RakushifuError(502, '提出情報の解析に失敗しました');
        }

        // 上流のレスポンスをそのまま返さず、画面が使うフィールドだけに絞る
        // （/ajax/organizations は氏名やメールも含むので、職種だけを取り出す）
        return {
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
        };
      }),

    getDesiredShifts: (startDate, endDate) =>
      guard('希望シフトの取得でエラーが発生しました', async () => {
        const res = await session.request(
          `${BASE_URL}/typed/api/staff/desired_schedules?start_date=${startDate}&end_date=${endDate}`,
          { headers: jsonHeaders(SUBMIT_PAGE) },
        );
        ensureAuthorized(res);
        if (!res.ok) {
          throw new RakushifuError(res.status, '希望シフトの取得に失敗しました');
        }

        const data = (await readJson(res)) as { results?: DesiredSchedule[] } | null;
        const results = data?.results;
        if (!Array.isArray(results)) {
          throw new RakushifuError(502, '希望シフトの解析に失敗しました');
        }

        // 上流は user_id や belonging_* も返すが、画面が使うフィールドだけに絞る
        return {
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
        };
      }),

    submitShifts: async (shifts) => {
      // 検証は上流に何も送らないうちに済ませる（通信の失敗と取り違えないよう guard の外）
      const sanitized = sanitizeShifts(shifts);
      if ('error' in sanitized) {
        throw new RakushifuError(400, sanitized.error);
      }

      return guard('シフトの提出でエラーが発生しました', async () => {
        // 1. 提出ページの HTML から CSRF トークンを取る。
        //    この GET で回転した _Rakushifu_session への差し替えはセッション側が行う。
        const pageRes = await session.request(SUBMIT_PAGE, {
          headers: {
            Accept: 'text/html,application/xhtml+xml',
            'User-Agent': USER_AGENT,
            Referer: SUBMIT_PAGE,
          },
        });
        // セッション切れはログイン画面へのリダイレクトで分かる。リダイレクトを追わない
        // セッションなら 3xx、追うセッションなら最終 URL が提出ページから外れる。
        if (
          pageRes.status === 401 ||
          isRedirect(pageRes.status) ||
          pathOf(pageRes.url) !== SUBMIT_PAGE_PATH
        ) {
          throw new RakushifuError(401, UNAUTHORIZED);
        }
        if (!pageRes.ok) {
          throw new RakushifuError(502, '提出ページの取得に失敗しました');
        }

        // 属性の並び順に依存しないよう、タグを取ってから値を取る2段構え
        const html = await pageRes.text();
        const tag = html.match(/<[^>]*\bid="csrf-token"[^>]*>/)?.[0];
        const token = tag?.match(/data-csrf-token="([^"]+)"/)?.[1];
        if (!token || !/^[A-Za-z0-9+/=_-]{40,200}$/.test(token)) {
          // らくしふ側の HTML 構造が変わった可能性が高いので、他の失敗と文言を分ける
          throw new RakushifuError(502, '提出トークンの取得に失敗しました');
        }

        // 2. 検証済みの値だけで組み直したボディを送る
        const upsertRes = await session.request(`${BASE_URL}/typed/api/staff/schedules/upsert`, {
          method: 'POST',
          headers: {
            Accept: ACCEPT_JSON,
            'User-Agent': USER_AGENT,
            Referer: SUBMIT_PAGE,
            'Content-Type': 'application/json',
            'X-CSRF-Token': token,
            'Xbit-Accept-Language': 'ja',
            'Xbit-Device-Type': 'web',
            Origin: BASE_URL,
          },
          body: JSON.stringify({ shifts: sanitized.items }),
        });

        ensureAuthorized(upsertRes);
        if (upsertRes.status === 422) {
          const detail = (await readJson(upsertRes).catch(() => null)) as {
            detail?: unknown;
            invalid_params?: unknown;
          } | null;
          // 上流の内部情報が混ざりうるので、素性のはっきりした短い文字列だけ通す
          const message =
            typeof detail?.detail === 'string' && detail.detail.length <= MAX_DETAIL_LENGTH
              ? detail.detail
              : '入力内容に誤りがあります';
          const invalidDates = (Array.isArray(detail?.invalid_params) ? detail.invalid_params : [])
            .map((p: unknown) => (p as { name?: unknown } | null)?.name)
            .filter((name): name is string => typeof name === 'string' && DATE_PATTERN.test(name))
            .slice(0, MAX_SHIFTS);
          throw new RakushifuError(422, message, invalidDates);
        }
        if (!upsertRes.ok) {
          throw new RakushifuError(502, 'シフトの提出に失敗しました');
        }

        // 上流のボディは返さない（提出できたかどうかだけが必要）
        return { success: true as const, count: sanitized.items.length };
      });
    },
  };
}
