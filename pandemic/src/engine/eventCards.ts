// 이벤트 카드 5종의 표시용 이름/설명. 실제 효과는 events.ts에 있고, 여기는
// UI에서 "이게 무슨 카드인지" 보여주기 위한 텍스트만 모아 둔다.
import type { EventId } from './types'

export const EVENT_INFO: Record<EventId, { name: string; description: string }> = {
  airlift: {
    name: '긴급 공중 수송',
    description: '자신 또는 다른 플레이어의 말을 원하는 도시로 즉시 이동시킨다.',
  },
  governmentGrant: {
    name: '정부 보조금',
    description: '카드를 버리지 않고, 원하는 도시에 연구소를 건설한다.',
  },
  oneQuietNight: {
    name: '평온한 하룻밤',
    description: '다음에 돌아올 도시 감염 단계를 한 번 완전히 생략한다.',
  },
  forecast: {
    name: '예측',
    description: '감염 덱 맨 위 6장을 확인하고 원하는 순서로 다시 쌓는다.',
  },
  resilientPopulation: {
    name: '항체 보유자',
    description: '감염 버림 더미에서 카드 1장을 골라 게임에서 완전히 제거한다.',
  },
}
