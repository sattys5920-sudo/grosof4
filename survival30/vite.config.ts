import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 어떤 하위 경로에 배포해도 그대로 동작하도록 상대 경로로 빌드한다.
// 테스트 설정은 vitest.config.ts에 따로 둔다 (vitest가 번들한 vite 타입과
// 이 프로젝트의 vite 타입이 서로 달라 여기서 합치면 타입 충돌이 난다).
export default defineConfig({
  base: './',
  plugins: [react()],
})
