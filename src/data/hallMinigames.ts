import type { HallMinigameKind } from './types'

// 강당 미니게임 종류별 선택지. 참여자는 참여하는 순간 둘 중 하나를 직접 골라야 하고,
// 승부가 갈릴 때 실제로 뽑힌 결과와 자신의 선택이 일치하면 이긴다.
export const MINIGAME_OPTIONS: Record<HallMinigameKind, { id: string; label: string }[]> = {
  oddeven: [
    { id: 'odd', label: '홀' },
    { id: 'even', label: '짝' },
  ],
  poker: [
    { id: 'high', label: '하이 (내 패가 더 높다)' },
    { id: 'low', label: '로우 (내 패가 더 낮다)' },
  ],
  robo77: [
    { id: 'over', label: '오버 (합계 77 초과)' },
    { id: 'under', label: '언더 (합계 77 이하)' },
  ],
}
