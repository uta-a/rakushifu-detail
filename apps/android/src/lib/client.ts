import { createRakushifuClient } from '@rakushifu/core';
import { NativeJarSession } from './session';

/**
 * アプリで1つのらくしふクライアント。cookie は OS の jar に入るので、画面からの取得も
 * バックグラウンドの確認（src/notifications）も同じクライアントを使えばよい。
 */
export const client = createRakushifuClient(new NativeJarSession());
