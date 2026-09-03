import type { ItemId } from './types'

export interface ItemDef {
  id: ItemId
  name: string
  space: number
  /** 30초 준비 단계에서 직접 주울 수 있는 아이템인지 */
  prepAvailable: boolean
  description: string
}

// 물/통조림은 별도 인벤토리 슬롯이 아니라 GameStats.water / GameStats.food 그
// 자체를 늘리는 자원이다 (공간은 여전히 차지한다). 그 외 아이템만 inventory에
// 개수로 들어간다.
export const ITEMS: Record<ItemId, ItemDef> = {
  water: { id: 'water', name: '물', space: 1, prepAvailable: true, description: '물 +1' },
  can: { id: 'can', name: '통조림', space: 1, prepAvailable: true, description: '식량 +1' },
  medicine: {
    id: 'medicine',
    name: '의약품',
    space: 1,
    prepAvailable: true,
    description: '치료 행동에 사용 — 체력 +20 (의사 동행 시 +30)',
  },
  bandage: {
    id: 'bandage',
    name: '붕대',
    space: 1,
    prepAvailable: true,
    description: '치료 행동에 사용 — 부상 상태 제거',
  },
  flashlight: {
    id: 'flashlight',
    name: '손전등',
    space: 1,
    prepAvailable: true,
    description: '탐색 성공률 +5%',
  },
  battery: {
    id: 'battery',
    name: '배터리',
    space: 1,
    prepAvailable: true,
    description: '사용하면 전력 +5',
  },
  radio: {
    id: 'radio',
    name: '라디오',
    space: 2,
    prepAvailable: true,
    description: '라디오 청취 행동에 필요 — 정보 획득',
  },
  map: { id: 'map', name: '지도', space: 1, prepAvailable: true, description: '탐색 성공률 +5%' },
  axe: {
    id: 'axe',
    name: '도끼',
    space: 2,
    prepAvailable: true,
    description: '탐색 성공률 +5%, 특정 위험 이벤트 피해 감소',
  },
  toolbox: {
    id: 'toolbox',
    name: '공구상자',
    space: 2,
    prepAvailable: true,
    description: '수리량 +10, 일부 파손 이벤트 피해 감소',
  },
  blanket: {
    id: 'blanket',
    name: '담요',
    space: 2,
    prepAvailable: true,
    description: '휴식 시 체력 회복 +3',
  },
  mask: {
    id: 'mask',
    name: '마스크',
    space: 1,
    prepAvailable: true,
    description: '오염 관련 이벤트 피해 50% 감소',
  },
  filter: {
    id: 'filter',
    name: '정수 필터',
    space: 2,
    prepAvailable: true,
    description: '오염된 물을 안전한 물로 정화',
  },
  matches: {
    id: 'matches',
    name: '성냥',
    space: 1,
    prepAvailable: true,
    description: '화재·난방 이벤트 대응, 제작 재료',
  },
  fishingRod: {
    id: 'fishingRod',
    name: '낚싯대',
    space: 2,
    prepAvailable: true,
    description: '특정 탐색에서 식량 추가 획득',
  },
  seed: {
    id: 'seed',
    name: '씨앗',
    space: 1,
    prepAvailable: true,
    description: '특정 이벤트에서 식량을 꾸준히 생산',
  },
  walkie: {
    id: 'walkie',
    name: '무전기',
    space: 2,
    prepAvailable: true,
    description: '특수 통신 이벤트 해금, 탐색 성공률 +3%',
  },
  generator: {
    id: 'generator',
    name: '발전기',
    space: 3,
    prepAvailable: true,
    description: '연료가 있을 때 전력 +10으로 충전 가능',
  },
  book: {
    id: 'book',
    name: '책',
    space: 1,
    prepAvailable: true,
    description: '휴식 시 정신력 회복 +3',
  },
  photo: {
    id: 'photo',
    name: '가족사진',
    space: 1,
    prepAvailable: true,
    description: '휴식 시 정신력 회복 +3, 특정 이벤트 보너스',
  },
  knife: {
    id: 'knife',
    name: '칼',
    space: 1,
    prepAvailable: true,
    description: '위험 이벤트 피해 감소',
  },
  binoculars: {
    id: 'binoculars',
    name: '망원경',
    space: 2,
    prepAvailable: true,
    description: '탐색 성공률 +5%, 관찰 이벤트에 필요',
  },
  backpack: {
    id: 'backpack',
    name: '가방',
    space: 2,
    prepAvailable: true,
    description: '최대 수용 공간 +6',
  },
  fuel: {
    id: 'fuel',
    name: '연료',
    space: 1,
    prepAvailable: false,
    description: '발전기에 넣으면 전력 +10',
  },
  repairKit: {
    id: 'repairKit',
    name: '수리 키트',
    space: 1,
    prepAvailable: false,
    description: '제작으로만 얻는다 — 수리 행동 1회에 +10 추가',
  },
  warmMeal: {
    id: 'warmMeal',
    name: '따뜻한 식사',
    space: 1,
    prepAvailable: false,
    description: '제작으로만 얻는다 — 사용 시 체력 +5, 정신력 +5',
  },
}

export const PREP_ITEM_ORDER: ItemId[] = [
  'water',
  'can',
  'medicine',
  'bandage',
  'flashlight',
  'battery',
  'radio',
  'map',
  'axe',
  'toolbox',
  'blanket',
  'mask',
  'filter',
  'matches',
  'fishingRod',
  'seed',
  'walkie',
  'generator',
  'book',
  'photo',
  'knife',
  'binoculars',
  'backpack',
]

export interface CraftRecipe {
  id: string
  name: string
  description: string
  consumes: Partial<Record<ItemId, number>>
  /** 있어야 하지만 소모되지는 않는 아이템 */
  keeps?: Partial<Record<ItemId, number>>
  produces: Partial<Record<ItemId, number>>
}

export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'warmMeal',
    name: '따뜻한 식사 만들기',
    description: '성냥 + 통조림',
    consumes: { matches: 1, can: 1 },
    produces: { warmMeal: 1 },
  },
  {
    id: 'repairKit',
    name: '수리 키트 조립',
    description: '공구상자(보유) + 배터리',
    consumes: { battery: 1 },
    keeps: { toolbox: 1 },
    produces: { repairKit: 1 },
  },
]
