/**
 * らくしふへの HTTP をどう運ぶかの差し替え口。
 *
 * 手順（どの URL をどの順で叩くか）は client.ts に一つだけ書き、cookie と
 * リダイレクトの扱いだけをここで実装ごとに変える。
 * - CookieSession: cookie を文字列で自前管理し、リダイレクトを追わない（Web版の Vercel Functions）
 * - NativeJarSession: OS の cookie jar に任せ、リダイレクトは自動で追われる（Android版）
 */
export interface RakushifuSession {
  request(url: string, init?: SessionRequestInit): Promise<SessionResponse>;
  /** cookie を名前で読めるセッションだけが実装する */
  getCookie?(name: string): string | undefined;
}

export interface SessionRequestInit {
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
}

export interface SessionResponse {
  status: number;
  ok: boolean;
  /** リダイレクトを追った場合は最終 URL */
  url: string;
  text(): Promise<string>;
}

/**
 * CookieSession が使う fetch の最小限の形。
 * core は DOM / Node の型に依存しないため、グローバルの fetch をここに合わせて受け取る。
 */
export type FetchLike = (
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    redirect?: 'manual';
  },
) => Promise<FetchResponseLike>;

export interface FetchResponseLike {
  status: number;
  ok: boolean;
  url: string;
  headers: {
    getSetCookie?(): string[];
    forEach(callback: (value: string, key: string) => void): void;
  };
  text(): Promise<string>;
}

/** フロントから届いた "k=v; k=v" を名前→値に開く */
export function parseCookieHeader(cookieString: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of cookieString.split(';')) {
    const index = part.indexOf('=');
    if (index <= 0) continue;
    result[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return result;
}

/** Set-Cookie ヘッダー群から名前→値だけを取り出す（属性は捨てる） */
export function parseSetCookies(setCookieHeaders: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const header of setCookieHeaders) {
    const match = header.match(/^([^=]+)=([^;]*)/);
    if (match) {
      result[match[1].trim()] = match[2].trim();
    }
  }
  return result;
}

function readSetCookies(headers: FetchResponseLike['headers']): string[] {
  if (headers.getSetCookie) return headers.getSetCookie();
  const cookies: string[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') cookies.push(value);
  });
  return cookies;
}

/**
 * cookie を文字列で持ち回るセッション。
 *
 * レスポンスの Set-Cookie は毎回取り込むので、提出ページの GET で回転した
 * _Rakushifu_session も次のリクエストから自動で使われる。リダイレクトは追わず、
 * 3xx をそのまま返す（ログイン画面へ飛ばされたことを呼び出し側が判定できるように）。
 */
export class CookieSession implements RakushifuSession {
  readonly #fetch: FetchLike;
  #cookies: Record<string, string>;

  constructor(fetchImpl: FetchLike, cookieString = '') {
    this.#fetch = fetchImpl;
    this.#cookies = parseCookieHeader(cookieString);
  }

  async request(url: string, init: SessionRequestInit = {}): Promise<SessionResponse> {
    const headers = { ...init.headers };
    const cookie = this.cookieString();
    if (cookie) headers.Cookie = cookie;

    const res = await this.#fetch(url, {
      method: init.method ?? 'GET',
      headers,
      body: init.body,
      redirect: 'manual',
    });
    Object.assign(this.#cookies, parseSetCookies(readSetCookies(res.headers)));

    return { status: res.status, ok: res.ok, url: res.url || url, text: () => res.text() };
  }

  getCookie(name: string): string | undefined {
    return this.#cookies[name];
  }

  /** 今持っている cookie を "k=v; k=v" にして返す（Web版がフロントへ渡す形） */
  cookieString(): string {
    return Object.entries(this.#cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
}
