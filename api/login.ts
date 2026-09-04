import type { VercelRequest, VercelResponse } from '@vercel/node';

const AUTH_API = 'https://api.accounts.rakushifu.com';
const ENTERPRISE_DOMAIN = 'skylark.enterprise.rakushifu.com';
const ENTERPRISE_CODE = 'skylark';

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

function buildCookieString(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { employeeCode, password } = req.body;
  if (
    typeof employeeCode !== 'string' ||
    typeof password !== 'string' ||
    employeeCode.length === 0 ||
    employeeCode.length > 100 ||
    password.length === 0 ||
    password.length > 200
  ) {
    return res.status(400).json({ error: '従業員IDとパスワードを入力してください' });
  }

  try {
    // Step 1: ログインAPIを呼び出し
    const loginRes = await fetch(`${AUTH_API}/sign_in_with_employee_code/browser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enterprise_code: ENTERPRISE_CODE,
        employee_code: employeeCode,
        password: password,
      }),
      redirect: 'manual',
    });

    if (!loginRes.ok && loginRes.status !== 302) {
      return res.status(401).json({ error: 'ログインに失敗しました' });
    }

    // Set-Cookieからxbit_at, xbit_rtを抽出
    const loginSetCookies = loginRes.headers.getSetCookie?.() ?? extractCookies(loginRes.headers);
    const authCookies = parseCookieValue(loginSetCookies);

    if (!authCookies['xbit_at']) {
      return res.status(401).json({ error: '認証トークンの取得に失敗しました' });
    }

    // Step 2: セッション確立
    const sessionRes = await fetch(
      `https://${ENTERPRISE_DOMAIN}/authenticated_users?role=staff&enterprise_code=${ENTERPRISE_CODE}`,
      {
        headers: {
          Cookie: buildCookieString(authCookies),
        },
        redirect: 'manual',
      }
    );

    const sessionSetCookies = sessionRes.headers.getSetCookie?.() ?? extractCookies(sessionRes.headers);
    const sessionCookies = parseCookieValue(sessionSetCookies);

    // 全cookieを統合
    const allCookies = { ...authCookies, ...sessionCookies };
    const cookieString = buildCookieString(allCookies);

    return res.status(200).json({ success: true, cookies: cookieString });
  } catch {
    // 認証情報が混ざりうるので、例外の中身はログに残さない
    console.error('Login error');
    return res.status(500).json({ error: 'ログイン処理でエラーが発生しました' });
  }
}
