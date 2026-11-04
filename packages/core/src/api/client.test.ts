import { describe, it, expect } from 'vitest';
import { createRakushifuClient } from './client.ts';
import { RakushifuError, isUnauthorized } from './errors.ts';
import { CookieSession } from './session.ts';
import type { FetchLike, FetchResponseLike, RakushifuSession, SessionRequestInit } from './session.ts';

const BASE = 'https://skylark.enterprise.rakushifu.com';
const SUBMIT_PAGE = `${BASE}/staff/v2/schedules/multiple_stores_submit`;
const TOKEN = 'A'.repeat(64);
const PAGE_HTML = `<html><head><meta name="x" content="y"><div data-csrf-token="${TOKEN}" id="csrf-token"></div></head></html>`;

interface Reply {
  status?: number;
  body?: unknown;
  /** リダイレクトを追った結果の最終 URL（既定はリクエスト URL） */
  url?: string;
  /** CookieSession 用: このレスポンスが返す Set-Cookie */
  setCookies?: string[];
}

type Route = (url: string, init: SessionRequestInit) => Reply | undefined;

interface Call {
  url: string;
  init: SessionRequestInit;
}

function toText(body: unknown): string {
  return typeof body === 'string' ? body : JSON.stringify(body ?? null);
}

/** cookie jar に任せる想定の偽セッション（getCookie を持たず、リダイレクトは追った後の URL を返す） */
function jarSession(route: Route) {
  const calls: Call[] = [];
  const session: RakushifuSession = {
    async request(url, init = {}) {
      calls.push({ url, init });
      const reply = route(url, init) ?? { status: 404 };
      const status = reply.status ?? 200;
      return {
        status,
        ok: status >= 200 && status < 300,
        url: reply.url ?? url,
        text: async () => toText(reply.body),
      };
    },
  };
  return { session, calls };
}

/** CookieSession に渡す偽の fetch。送られた Cookie ヘッダーを記録する */
function fakeFetch(route: Route) {
  const calls: Call[] = [];
  const fetchImpl: FetchLike = async (url, init) => {
    const sessionInit: SessionRequestInit = {
      method: init.method as SessionRequestInit['method'],
      headers: init.headers,
      body: init.body,
    };
    calls.push({ url, init: sessionInit });
    const reply = route(url, sessionInit) ?? { status: 404 };
    const status = reply.status ?? 200;
    const res: FetchResponseLike = {
      status,
      ok: status >= 200 && status < 300,
      url,
      headers: {
        getSetCookie: () => reply.setCookies ?? [],
        forEach: () => {},
      },
      text: async () => toText(reply.body),
    };
    return res;
  };
  return { fetchImpl, calls };
}

async function caught(promise: Promise<unknown>): Promise<RakushifuError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RakushifuError) return error;
    throw error;
  }
  throw new Error('例外が投げられなかった');
}

const VALID_SHIFTS = [
  {
    date: '2026-11-16',
    memo_text: null,
    fixed_shift_log_id: null,
    desired_schedule: {
      attending_store_id: 10,
      attending_genre_id: 2,
      start_hour: 17,
      start_minute: 0,
      end_hour: 22,
      end_minute: 0,
      off: false,
      off_type: 0,
    },
  },
  { date: '2026-11-17', memo_text: null, fixed_shift_log_id: null, desired_schedule: null },
];

describe('login', () => {
  const loginRoute =
    (opts: { loginStatus?: number; orgStatus?: number; setCookies?: string[] } = {}): Route =>
    (url) => {
      if (url.includes('/sign_in_with_employee_code/browser')) {
        return {
          status: opts.loginStatus ?? 302,
          setCookies: opts.setCookies ?? ['xbit_at=at1; Path=/; HttpOnly', 'xbit_rt=rt1; Path=/'],
        };
      }
      if (url.includes('/authenticated_users')) {
        return { status: 302, setCookies: ['_Rakushifu_session=s1; Path=/'] };
      }
      if (url.endsWith('/ajax/organizations')) {
        return { status: opts.orgStatus ?? 200, body: { current_user: { id: 1 } } };
      }
      return undefined;
    };

  it('CookieSession では xbit_at と enterprise のセッション cookie を集める', async () => {
    const { fetchImpl, calls } = fakeFetch(loginRoute());
    const session = new CookieSession(fetchImpl);
    await createRakushifuClient(session).login('123', 'pw');

    expect(session.cookieString()).toBe('xbit_at=at1; xbit_rt=rt1; _Rakushifu_session=s1');
    // 2本目には1本目で得た認証 cookie が載る
    expect(calls[1].init.headers?.Cookie).toBe('xbit_at=at1; xbit_rt=rt1');
    // Web版の上流へのリクエスト数は変えない（成否確認の追加リクエストをしない）
    expect(calls).toHaveLength(2);
    expect(JSON.parse(calls[0].init.body!)).toEqual({
      enterprise_code: 'skylark',
      employee_code: '123',
      password: 'pw',
    });
  });

  it('ログインAPIが 2xx でも 302 でもなければ失敗', async () => {
    const { fetchImpl } = fakeFetch(loginRoute({ loginStatus: 401 }));
    const error = await caught(createRakushifuClient(new CookieSession(fetchImpl)).login('1', 'x'));
    expect(error.status).toBe(401);
    expect(error.message).toBe('ログインに失敗しました');
  });

  it('xbit_at が返らなければ失敗', async () => {
    const { fetchImpl } = fakeFetch(loginRoute({ setCookies: ['other=1'] }));
    const error = await caught(createRakushifuClient(new CookieSession(fetchImpl)).login('1', 'x'));
    expect(error.status).toBe(401);
    expect(error.message).toBe('認証トークンの取得に失敗しました');
  });

  it('cookie を読めないセッションでは /ajax/organizations の 200 で成否を判定する', async () => {
    const ok = jarSession(loginRoute({ loginStatus: 200 }));
    await createRakushifuClient(ok.session).login('1', 'x');
    expect(ok.calls.map((c) => c.url.replace(/\?.*/, ''))).toEqual([
      'https://api.accounts.rakushifu.com/sign_in_with_employee_code/browser',
      `${BASE}/authenticated_users`,
      `${BASE}/ajax/organizations`,
    ]);

    const ng = jarSession(loginRoute({ loginStatus: 200, orgStatus: 401 }));
    const error = await caught(createRakushifuClient(ng.session).login('1', 'x'));
    expect(isUnauthorized(error)).toBe(true);
  });

  it('通信の例外は中身を捨てて固定の文言にする', async () => {
    const session: RakushifuSession = {
      request: async () => {
        throw new Error('socket hang up: Cookie=xbit_at=secret');
      },
    };
    const error = await caught(createRakushifuClient(session).login('1', 'x'));
    expect(error.status).toBe(500);
    expect(error.message).toBe('ログイン処理でエラーが発生しました');
    expect(error.message).not.toContain('secret');
  });
});

describe('getConfirmedShifts', () => {
  it('月の初日から末日までを取り、レスポンスをそのまま返す', async () => {
    const body = { confirmed_dates: ['2026-02-03'], schedules: [] };
    const { session, calls } = jarSession(() => ({ body }));
    const data = await createRakushifuClient(session).getConfirmedShifts(2026, 2);
    expect(data).toEqual(body);
    expect(calls[0].url).toContain('start_date=2026-02-01&end_date=2026-02-28');
    expect(calls[0].init.headers?.Referer).toBe(`${BASE}/staff/v2/schedules/confirmed/me`);
  });

  it('上流の 401 はセッション切れ', async () => {
    const { session } = jarSession(() => ({ status: 401 }));
    expect(isUnauthorized(await caught(createRakushifuClient(session).getConfirmedShifts(2026, 1)))).toBe(true);
  });

  it('上流のその他の失敗はステータスを引き継ぐ', async () => {
    const { session } = jarSession(() => ({ status: 503 }));
    const error = await caught(createRakushifuClient(session).getConfirmedShifts(2026, 1));
    expect(error.status).toBe(503);
    expect(error.message).toBe('シフトデータの取得に失敗しました');
  });
});

describe('getStoreShifts', () => {
  it('出勤・フロア/キッチン・時刻ありだけを、名前と時刻に絞って返す', async () => {
    const { session } = jarSession((url) => {
      if (url.endsWith('/ajax/organizations')) return { body: { current_user: { id: 7, email: 'x' } } };
      return {
        body: {
          users: [
            { id: 7, name: '自分', birthday: '2000-01-01' },
            { id: 8, name: '他人' },
          ],
          shared: [
            { user_id: 7, attending_genre_id: 2, start_as_min: 1020, end_as_min: 1320, off: false },
            { user_id: 8, attending_genre_id: 3, start_as_min: 1080, end_as_min: 1380, off: false },
            { user_id: 8, attending_genre_id: 9, start_as_min: 600, end_as_min: 900, off: false },
            { user_id: 8, attending_genre_id: 2, start_as_min: null, end_as_min: null, off: false },
            { user_id: 8, attending_genre_id: 2, start_as_min: 600, end_as_min: 900, off: true },
            { user_id: 99, attending_genre_id: 2, start_as_min: 600, end_as_min: 900, off: false },
          ],
        },
      };
    });
    const data = await createRakushifuClient(session).getStoreShifts(10, '2026-11-20');
    expect(data).toEqual({
      selfUserId: 7,
      date: '2026-11-20',
      members: [
        { userId: 7, name: '自分', genreId: 2, startAsMin: 1020, endAsMin: 1320 },
        { userId: 8, name: '他人', genreId: 3, startAsMin: 1080, endAsMin: 1380 },
      ],
    });
  });

  it('自分の user_id が取れなければ 502', async () => {
    const { session } = jarSession(() => ({ body: {} }));
    const error = await caught(createRakushifuClient(session).getStoreShifts(10, '2026-11-20'));
    expect(error.status).toBe(502);
    expect(error.message).toBe('ユーザー情報の解析に失敗しました');
  });
});

describe('getSubmitContext', () => {
  it('6本を並列に取り、画面が使うフィールドだけに絞る', async () => {
    const { session, calls } = jarSession((url) => {
      if (url.endsWith('/user_submit_terms'))
        return {
          body: {
            results: [
              {
                user_id: 1,
                store_id: 10,
                start_date: '2026-11-16',
                end_date: '2026-11-30',
                submit_end_at: '2026-11-05T23:59:00+09:00',
                submitted: false,
                extra: 'x',
              },
            ],
          },
        };
      if (url.endsWith('/desired_schedule_submittable_stores'))
        return {
          body: {
            results: [
              {
                id: 10,
                name: '店',
                short_name: '店',
                interval_minute: 15,
                min_hour: 9,
                max_hour: 26,
                submittable_start_date: '2026-11-16',
              },
            ],
          },
        };
      if (url.endsWith('/basic_shifts/me'))
        return {
          body: {
            results: [{ weekday: 1, start_hour: 17, start_minute: 0, end_hour: 22, end_minute: 0, off: false }],
          },
        };
      if (url.endsWith('/user_acceptable_working_times')) return { body: {} };
      if (url.endsWith('/desired_off_limit')) return { body: { desired_off_limit: { has_limit: true, max_count: 4 } } };
      if (url.endsWith('/ajax/organizations'))
        return { body: { current_user: { current_belong_genre_id: 2, email: 'a@example.com' } } };
      return undefined;
    });

    const ctx = await createRakushifuClient(session).getSubmitContext();
    expect(calls).toHaveLength(6);
    expect(ctx.currentGenreId).toBe(2);
    expect(ctx.terms[0]).not.toHaveProperty('extra');
    expect(ctx.stores[0].enabled_genre_ids).toEqual([]);
    expect(ctx.basicShifts[0].attending_store_id).toBe(0);
    expect(ctx.acceptableTimes).toEqual([]);
    expect(ctx.offLimit).toEqual({ has_limit: true, max_count: 4 });
    expect(JSON.stringify(ctx)).not.toContain('example.com');
  });

  it('どれか1本でも 401 ならセッション切れ', async () => {
    const { session } = jarSession((url) =>
      url.endsWith('/desired_off_limit') ? { status: 401 } : { body: { results: [] } },
    );
    expect(isUnauthorized(await caught(createRakushifuClient(session).getSubmitContext()))).toBe(true);
  });

  it('必須の配列が無ければ 502', async () => {
    const { session } = jarSession(() => ({ body: {} }));
    const error = await caught(createRakushifuClient(session).getSubmitContext());
    expect(error.status).toBe(502);
    expect(error.message).toBe('提出情報の解析に失敗しました');
  });
});

describe('getDesiredShifts', () => {
  it('上流の余計なフィールドを落とす', async () => {
    const row = {
      id: 1,
      date: '2026-11-16',
      attending_store_id: 10,
      attending_genre_id: 2,
      start_hour: 17,
      start_minute: 0,
      end_hour: 22,
      end_minute: 0,
      off: false,
      off_type: 0,
      memo_text: null,
      fixed_shift_log_id: null,
    };
    const { session, calls } = jarSession(() => ({ body: { results: [{ ...row, user_id: 5 }] } }));
    const data = await createRakushifuClient(session).getDesiredShifts('2026-11-16', '2026-11-30');
    expect(data).toEqual({ results: [row] });
    expect(calls[0].url).toContain('start_date=2026-11-16&end_date=2026-11-30');
  });

  it('JSON でなければ固定の文言で 500', async () => {
    const { session } = jarSession(() => ({ body: '<html>maintenance</html>' }));
    const error = await caught(createRakushifuClient(session).getDesiredShifts('2026-11-16', '2026-11-30'));
    expect(error.status).toBe(500);
    expect(error.message).toBe('希望シフトの取得でエラーが発生しました');
  });
});

describe('submitShifts', () => {
  const submitRoute =
    (opts: { page?: Reply; upsert?: Reply } = {}): Route =>
    (url) => {
      if (url === SUBMIT_PAGE) {
        return { body: PAGE_HTML, setCookies: ['_Rakushifu_session=rotated; Path=/'], ...opts.page };
      }
      if (url.endsWith('/typed/api/staff/schedules/upsert')) {
        return { body: { ok: true, internal: 'x' }, ...opts.upsert };
      }
      return undefined;
    };

  it('提出ページで回転したセッション cookie とトークンで POST する', async () => {
    const { fetchImpl, calls } = fakeFetch(submitRoute());
    const session = new CookieSession(fetchImpl, 'xbit_at=at1; _Rakushifu_session=old');
    const result = await createRakushifuClient(session).submitShifts(VALID_SHIFTS);

    expect(result).toEqual({ success: true, count: 2 });
    expect(calls[0].init.headers?.Cookie).toBe('xbit_at=at1; _Rakushifu_session=old');
    const post = calls[1];
    expect(post.init.method).toBe('POST');
    expect(post.init.headers?.Cookie).toBe('xbit_at=at1; _Rakushifu_session=rotated');
    expect(post.init.headers?.['X-CSRF-Token']).toBe(TOKEN);
    expect(JSON.parse(post.init.body!)).toEqual({ shifts: VALID_SHIFTS });
  });

  it('検証を通らない内容は上流に何も送らず 400', async () => {
    const { session, calls } = jarSession(submitRoute());
    const error = await caught(
      createRakushifuClient(session).submitShifts([VALID_SHIFTS[1], VALID_SHIFTS[1]]),
    );
    expect(error.status).toBe(400);
    expect(error.message).toBe('日付が重複しています: 2026-11-17');
    expect(calls).toHaveLength(0);
  });

  it('検証で余計なキーを落としてから送る', async () => {
    const { session, calls } = jarSession(submitRoute());
    await createRakushifuClient(session).submitShifts([{ ...VALID_SHIFTS[1], user_id: 999 }]);
    expect(calls[1].init.body).not.toContain('user_id');
  });

  it('CookieSession で提出ページが 3xx ならセッション切れ', async () => {
    const { fetchImpl, calls } = fakeFetch(submitRoute({ page: { status: 302, body: '' } }));
    const error = await caught(createRakushifuClient(new CookieSession(fetchImpl, 'a=1')).submitShifts(VALID_SHIFTS));
    expect(isUnauthorized(error)).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('cookie jar のセッションでログイン画面へ飛ばされたらセッション切れ', async () => {
    const { session, calls } = jarSession(
      submitRoute({ page: { url: `${BASE}/staff/sign_in?redirect=x`, body: '<html>login</html>' } }),
    );
    const error = await caught(createRakushifuClient(session).submitShifts(VALID_SHIFTS));
    expect(isUnauthorized(error)).toBe(true);
    expect(calls).toHaveLength(1);
  });

  it('提出ページにクエリが付いて戻っても提出ページとみなす', async () => {
    const { session } = jarSession(submitRoute({ page: { url: `${SUBMIT_PAGE}?locale=ja`, body: PAGE_HTML } }));
    await expect(createRakushifuClient(session).submitShifts(VALID_SHIFTS)).resolves.toEqual({
      success: true,
      count: 2,
    });
  });

  it('CSRF トークンが取れなければ専用の文言で 502', async () => {
    const { session, calls } = jarSession(submitRoute({ page: { body: '<html>changed</html>' } }));
    const error = await caught(createRakushifuClient(session).submitShifts(VALID_SHIFTS));
    expect(error.status).toBe(502);
    expect(error.message).toBe('提出トークンの取得に失敗しました');
    expect(calls).toHaveLength(1);
  });

  it('形式のおかしいトークンは送らない', async () => {
    const html = '<div id="csrf-token" data-csrf-token="short<script>"></div>';
    const { session } = jarSession(submitRoute({ page: { body: html } }));
    const error = await caught(createRakushifuClient(session).submitShifts(VALID_SHIFTS));
    expect(error.message).toBe('提出トークンの取得に失敗しました');
  });

  it('422 は detail と日付だけの invalidDates を返す', async () => {
    const { session } = jarSession(
      submitRoute({
        upsert: {
          status: 422,
          body: {
            detail: '提出期間外です',
            invalid_params: [{ name: '2026-11-16' }, { name: 'shifts[0]' }, null, { name: 3 }],
          },
        },
      }),
    );
    const error = await caught(createRakushifuClient(session).submitShifts(VALID_SHIFTS));
    expect(error.status).toBe(422);
    expect(error.message).toBe('提出期間外です');
    expect(error.invalidDates).toEqual(['2026-11-16']);
  });

  it('422 の detail が長すぎる・JSON でないときは汎用の文言', async () => {
    const long = jarSession(submitRoute({ upsert: { status: 422, body: { detail: 'x'.repeat(201) } } }));
    expect((await caught(createRakushifuClient(long.session).submitShifts(VALID_SHIFTS))).message).toBe(
      '入力内容に誤りがあります',
    );

    const html = jarSession(submitRoute({ upsert: { status: 422, body: '<html>' } }));
    const error = await caught(createRakushifuClient(html.session).submitShifts(VALID_SHIFTS));
    expect(error.message).toBe('入力内容に誤りがあります');
    expect(error.invalidDates).toEqual([]);
  });

  it('upsert の 401 はセッション切れ、その他の失敗は 502', async () => {
    const unauthorized = jarSession(submitRoute({ upsert: { status: 401 } }));
    expect(isUnauthorized(await caught(createRakushifuClient(unauthorized.session).submitShifts(VALID_SHIFTS)))).toBe(
      true,
    );

    const failed = jarSession(submitRoute({ upsert: { status: 500 } }));
    const error = await caught(createRakushifuClient(failed.session).submitShifts(VALID_SHIFTS));
    expect(error.status).toBe(502);
    expect(error.message).toBe('シフトの提出に失敗しました');
  });
});
