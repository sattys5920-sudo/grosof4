import type { ItemId, LocationId } from './types'

export interface RewardTable {
  /** 성공 시 1~3개를 이 풀에서 뽑는다. */
  items: ItemId[]
  /** 자원(물/식량) 보상 가중치 */
  water: number
  food: number
  /** 이 장소에서만 얻을 수 있는 스토리 플래그 (희귀 확률) */
  rareFlag?: string
  rareChance?: number
}

// 준비 단계에서만 구할 수 있던 장비도 전부 탐색으로 확률상 나올 수 있게, 21종
// 장비를 장소별로 나눠 담는다 (물/식량은 아래 water/food 필드로 별도 처리).
export const LOCATION_REWARDS: Record<LocationId, RewardTable> = {
  house: {
    items: ['bandage', 'blanket', 'book', 'matches', 'photo', 'seed', 'knife'],
    water: 3,
    food: 2,
  },
  store: {
    items: ['battery', 'flashlight', 'matches', 'fishingRod', 'radio'],
    water: 3,
    food: 3,
  },
  hospital: {
    items: ['medicine', 'bandage', 'mask', 'filter'],
    water: 1,
    food: 1,
  },
  police: {
    items: ['knife', 'axe', 'mask', 'radio', 'map', 'binoculars', 'toolbox'],
    water: 1,
    food: 1,
    rareFlag: 'policeRecord',
    rareChance: 20,
  },
  military: {
    items: ['fuel', 'generator', 'walkie', 'axe', 'binoculars', 'toolbox', 'backpack'],
    water: 1,
    food: 1,
    rareFlag: 'militaryRecord',
    rareChance: 30,
  },
  lab: {
    items: ['fuel', 'medicine', 'filter', 'seed', 'backpack'],
    water: 0,
    food: 0,
    rareFlag: 'blackBox',
    rareChance: 35,
  },
}

export const LOCATION_ORDER: LocationId[] = ['house', 'store', 'hospital', 'police', 'military', 'lab']

export type RiskOutcome = 'hp' | 'mental' | 'itemBreak' | 'injury'

/** 탐색 실패/위험 판정에 걸렸을 때 무엇이 적용될지 뽑는 가중치 테이블. */
export const RISK_OUTCOME_WEIGHTS: { outcome: RiskOutcome; weight: number }[] = [
  { outcome: 'hp', weight: 35 },
  { outcome: 'mental', weight: 25 },
  { outcome: 'itemBreak', weight: 20 },
  { outcome: 'injury', weight: 20 },
]
