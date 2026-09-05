// 오리지널 위기 카드 6종. 원작처럼 카드마다 고유한 실패 효과를 갖추진
// 않았고, 성공/실패에 따른 사기 증감으로 단순화했다(STEP 9 범위).
import type { Crisis } from './types'

export const CRISES: Crisis[] = [
  { id: 'ammoShortage', title: '탄약 부족', description: '좀비 떼가 몰려옵니다. 무기를 모아야 버틸 수 있어요.', requiredCategory: 'weapon', icon: '🔫' },
  { id: 'foodShortage', title: '식량 창고 붕괴', description: '저장고가 망가졌습니다. 먹을 것을 다시 채워야 해요.', requiredCategory: 'food', icon: '🥫' },
  { id: 'outbreak', title: '전염병 확산', description: '콜로니에 병이 돕니다. 의료품이 급합니다.', requiredCategory: 'medical', icon: '🤒' },
  { id: 'generatorDown', title: '발전기 고장', description: '전기가 끊겼습니다. 수리할 도구가 필요해요.', requiredCategory: 'tool', icon: '🔧' },
  { id: 'lostContact', title: '연락 두절', description: '다른 생존자 무리와 연락이 끊겼습니다. 정보가 필요해요.', requiredCategory: 'info', icon: '📡' },
  { id: 'harshWinter', title: '혹독한 한파', description: '기온이 급격히 떨어집니다. 버틸 도구가 필요해요.', requiredCategory: 'tool', icon: '❄️' },
]

export const CRISIS_MAP: Record<string, Crisis> = CRISES.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<string, Crisis>,
)
