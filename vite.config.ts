import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/grosof4/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // 기존 괴이 게임. 이 링크(/grosof4/)는 그대로 둔다.
        main: resolve(__dirname, 'index.html'),
        // 새 게임은 별도 주소(/grosof4/school.html)로만 열린다.
        school: resolve(__dirname, 'school.html'),
      },
    },
  },
})
