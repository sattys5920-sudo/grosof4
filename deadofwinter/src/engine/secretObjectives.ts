// 비밀 목표 카드 8종(STEP 11). 배분받은 카드는 본인만 볼 수 있어야
// 게임이 성립하므로, 이 데이터 자체는 공개해도 되지만(카드 텍스트는
// 원래도 인쇄돼 있는 것) 어떤 플레이어가 "어떤 카드를 받았는지"는
// secrets/{uid} 서브컬렉션에 비공개로 저장한다(room.ts 참고).
import type { SecretObjective } from './types'

export const SECRET_OBJECTIVES: SecretObjective[] = [
  {
    id: 'diverseCollector',
    title: '다재다능한 수집가',
    description: '게임이 끝날 때까지 서로 다른 대분류 아이템을 4종 이상 모으세요.',
    isBetrayer: false,
    icon: '🎒',
  },
  {
    id: 'crisisDevotee',
    title: '헌신적인 기여자',
    description: '게임이 끝날 때까지 위기 카드에 아이템을 3번 이상 기여하세요.',
    isBetrayer: false,
    icon: '🤝',
  },
  {
    id: 'zombieHunter',
    title: '좀비 사냥꾼',
    description: '게임이 끝날 때까지 좀비를 5마리 이상 처치하세요.',
    isBetrayer: false,
    icon: '🪓',
  },
  {
    id: 'protector',
    title: '수호자',
    description: '내 생존자를 한 명도 잃지 않고 게임을 끝내세요.',
    isBetrayer: false,
    icon: '🛡️',
  },
  {
    id: 'explorer',
    title: '끈질긴 탐험가',
    description: '게임이 끝날 때까지 탐색을 8번 이상 하세요.',
    isBetrayer: false,
    icon: '🔦',
  },
  {
    id: 'survivorOfWinter',
    title: '한파의 생존자',
    description: '동상에 걸리지 않고 5라운드까지 버티세요.',
    isBetrayer: false,
    icon: '🧊',
  },
  {
    id: 'secretSaboteur',
    title: '배신자 — 파괴 공작원',
    description: '아무도 몰래 콜로니의 자원을 낭비하세요. 콜로니가 무너져야 당신이 승리합니다.',
    isBetrayer: true,
    icon: '🔥',
  },
  {
    id: 'secretDefector',
    title: '배신자 — 이탈자',
    description: '기회를 봐서 위기 해결을 방해하세요. 콜로니가 무너져야 당신이 승리합니다.',
    isBetrayer: true,
    icon: '🗡️',
  },
]

export const SECRET_OBJECTIVE_MAP: Record<string, SecretObjective> = SECRET_OBJECTIVES.reduce(
  (acc, o) => ({ ...acc, [o.id]: o }),
  {} as Record<string, SecretObjective>,
)
