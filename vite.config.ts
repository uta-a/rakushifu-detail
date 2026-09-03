import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // API だけ `npx vercel dev --listen 3001` の Serverless Functions に転送する。
      // vercel.json の SPA フォールバックは vercel dev だと Vite の dev アセット
      // （/src/*, /@vite/*）まで index.html に書き換えてしまうため、フロントは
      // この Vite サーバーで動かし、vercel dev は API 専用として使う。
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
  },
})
