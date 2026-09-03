# 30일 생존

브라우저에서 혼자 플레이하는 생존 시뮬레이션. 60초 안에 챙긴 물건으로 대피소에
들어가 30일을 버틴다. 서버나 다른 플레이어 없이, 기기 안(localStorage)에만 진행
상황이 저장된다.

## 구조

- `src/engine/` — 게임 로직 전부 (UI와 완전히 분리). 숫자는 `rules.ts` 한 곳에서만 관리한다.
  - `rules.ts` — 모든 수치 상수
  - `types.ts` — 상태/이벤트 타입
  - `items.ts` / `survivors.ts` / `locations.ts` — 데이터 테이블
  - `events.ts` — 100개 이벤트 데이터
  - `engine.ts` — 하루 진행, 행동 판정, 확률 계산
  - `endings.ts` — 12개 엔딩 판정
  - `engine.test.ts` — 기획서 42번 자동 검증 체크리스트를 옮긴 테스트
- `src/screens/` — 준비/본게임/엔딩 화면
- `src/App.tsx` — 화면 전환, 저장/불러오기

## 개발

```bash
npm install
npm run dev       # http://localhost:5173
npm run test      # 자동 검증
npm run build
```
