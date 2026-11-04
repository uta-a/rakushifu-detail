/**
 * らくしふクライアントが投げる唯一のエラー。
 *
 * message は利用者にそのまま見せてよい文言だけを入れる。cookie・上流の HTML・
 * 例外の中身は載せないこと（Web版はこれをそのまま HTTP レスポンスにする）。
 */
export class RakushifuError extends Error {
  readonly status: number;
  /** 上流が 422 で返した、受け付けられなかった日付（YYYY-MM-DD） */
  readonly invalidDates?: string[];

  constructor(status: number, message: string, invalidDates?: string[]) {
    super(message);
    this.name = 'RakushifuError';
    this.status = status;
    if (invalidDates) this.invalidDates = invalidDates;
  }
}

/** セッション切れ（再ログインで直る可能性がある失敗）かどうか */
export function isUnauthorized(error: unknown): error is RakushifuError {
  return error instanceof RakushifuError && error.status === 401;
}
