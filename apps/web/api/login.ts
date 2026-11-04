import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRakushifuClient } from '@rakushifu/core';
import { createSession, sendError } from './_lib/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { employeeCode, password } = req.body ?? {};
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
    const session = createSession();
    await createRakushifuClient(session).login(employeeCode, password);
    // cookie はサーバーに保存せず、フロントの sessionStorage に持たせる
    return res.status(200).json({ success: true, cookies: session.cookieString() });
  } catch (error) {
    return sendError(res, error, 'Login error');
  }
}
