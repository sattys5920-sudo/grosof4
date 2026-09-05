// 크로스로드 카드 6종(STEP 10). 원작처럼 생존자별 손패가 아니라
// 라운드마다 공용으로 하나 뽑는 방식으로 단순화했다 — 카드가 지정한
// 장소에서 이동/탐색이 일어나면 그 자리에서 발동해 선택지를 준다.
import type { CrossroadCard } from './types'

export const CROSSROADS: CrossroadCard[] = [
  {
    id: 'strangerAtPolice',
    title: '낯선 생존자',
    triggerLocationId: 'police',
    icon: '🚓',
    description: '경찰서 구석에 숨어 있던 낯선 사람이 도움을 청합니다.',
    prompt: '식량을 나눠주고 콜로니로 데려올까요?',
    yesLabel: '데려온다',
    noLabel: '외면한다',
    yesEffect: { foodDelta: -2, moraleDelta: 1 },
    noEffect: { moraleDelta: -1 },
  },
  {
    id: 'spoiledStock',
    title: '상한 식료품',
    triggerLocationId: 'grocery',
    icon: '🛒',
    description: '식료품점 선반에 상한 음식이 잔뜩 쌓여 있습니다.',
    prompt: '위험을 감수하고 먹을 수 있는 것만 골라낼까요?',
    yesLabel: '골라낸다',
    noLabel: '포기한다',
    yesEffect: { foodDelta: 2, moraleDelta: -1 },
    noEffect: {},
  },
  {
    id: 'panicAtSchool',
    title: '아이들의 공포',
    triggerLocationId: 'school',
    icon: '🏫',
    description: '교실에 갇혀 있던 아이들이 겁에 질려 울고 있습니다.',
    prompt: '아이들을 진정시키고 함께 데려올까요?',
    yesLabel: '진정시킨다',
    noLabel: '서둘러 떠난다',
    yesEffect: { moraleDelta: 2 },
    noEffect: { zombieDelta: { locationId: 'school', amount: 1 } },
  },
  {
    id: 'sirenAtGasStation',
    title: '울리는 사이렌',
    triggerLocationId: 'gasStation',
    icon: '⛽',
    description: '주유소 경보기가 갑자기 울리며 좀비들을 끌어모으고 있습니다.',
    prompt: '경보기를 부수러 갈까요?',
    yesLabel: '부순다',
    noLabel: '무시하고 떠난다',
    yesEffect: { moraleDelta: 1 },
    noEffect: { zombieDelta: { locationId: 'gasStation', amount: 2 } },
  },
  {
    id: 'oldRecords',
    title: '오래된 기록',
    triggerLocationId: 'library',
    icon: '📚',
    description: '서고에서 이전 생존자 무리가 남긴 기록을 발견했습니다.',
    prompt: '기록을 콜로니로 가져가 다른 이들과 나눌까요?',
    yesLabel: '가져간다',
    noLabel: '두고 온다',
    yesEffect: { moraleDelta: 1, foodDelta: -1 },
    noEffect: {},
  },
  {
    id: 'quarantineWard',
    title: '격리 병동',
    triggerLocationId: 'hospital',
    icon: '🏥',
    description: '병원 격리 병동 문 너머로 신음이 들립니다.',
    prompt: '문을 열어 상태를 확인할까요?',
    yesLabel: '문을 연다',
    noLabel: '지나친다',
    yesEffect: { moraleDelta: -1, foodDelta: 1 },
    noEffect: {},
  },
]

export const CROSSROAD_MAP: Record<string, CrossroadCard> = CROSSROADS.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<string, CrossroadCard>,
)
