import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 어떤 하위 경로에 배포해도 그대로 동작하도록 상대 경로로 빌드한다.
export default defineConfig({
  base: './',
  plugins: [react()],
})
