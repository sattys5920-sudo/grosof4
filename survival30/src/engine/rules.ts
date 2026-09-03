// 게임의 모든 수치는 이 파일에서만 관리한다. 이벤트/행동 코드는 절대 숫자를
// 직접 하드코딩하지 않고 GAME_RULES를 참조한다 (기획서 40, 41번 원칙).
import type { LocationId, MentalTier } from './types'

export const GAME_RULES = {
  MAX_HP: 100,
  MAX_MENTAL: 100,
  MAX_POWER: 99,
  MAX_SHELTER: 100,
  MAX_INFO: 100,
  MAX_TRUST: 100,
  MAX_CONTAMINATION: 100,

  START_HP: 100,
  START_MENTAL: 100,
  START_POWER: 20,
  START_SHELTER: 100,
  START_INFO: 0,
  START_TRUST: 0,

  BASE_CAPACITY: 12,
  BACKPACK_BONUS: 6,
  PREP_SECONDS: 60,
  PREP_WATER_COUNT: 10,
  PREP_FOOD_COUNT: 10,
  TOTAL_DAYS: 30,

  // 목마름/배고픔 게이지 — 물/식량 "아이템"과는 별개다. 매일 아침 자동으로
  // 줄어들고, 물/식량 아이템을 사용해야 회복된다.
  MAX_THIRST: 100,
  MAX_HUNGER: 100,
  START_THIRST: 100,
  START_HUNGER: 100,
  THIRST_DAILY_DROP: 10,
  HUNGER_DAILY_DROP: 10,
  THIRST_RECOVER: 30,
  HUNGER_RECOVER: 30,

  WATER_ZERO_HP: 10,
  WATER_ZERO_MENTAL: 5,
  DEHYDRATION_DAILY_HP: 10,
  WATER_DEATH_STREAK: 3,

  FOOD_ZERO_HP: 5,
  FOOD_ZERO_MENTAL: 3,
  STARVATION_DAILY_HP: 5,
  FOOD_DEATH_STREAK: 4,

  INJURY_UNTREATED_START_DAY: 3,
  INJURY_UNTREATED_HP: 5,
  INJURY_RECOVERY_PENALTY: 0.5,
  INJURY_EXPLORE_PENALTY: 10,

  REST_HP: 8,
  REST_MENTAL: 5,
  REST_BLANKET_HP: 3,
  REST_BOOK_MENTAL: 3,
  REST_PHOTO_MENTAL: 3,

  CONTAMINATION_HP_THRESHOLD: 50,
  CONTAMINATION_HP_DAILY: 5,
  CONTAMINATION_INFECT_THRESHOLD: 80,

  RAID_BASE_CHANCE: { safe: 10, unstable: 15, danger: 30, critical: 20 } as Record<string, number>,
  RAID_SHELTER_DAMAGE: 10,
  RAID_HP_CHANCE: 40,
  RAID_HP_DAMAGE: 10,

  REPAIR_SHELTER: 10,
  REPAIR_TOOLBOX_BONUS: 10,
  REPAIR_ENGINEER_MULT: 1.5,

  SCOUT_MENTAL_COST: 1,
  SCOUT_EXPLORE_BONUS: 10,
  SCOUT_EVENT_RISK_REDUCTION: 10,

  RADIO_POWER_COST: 2,
  RADIO_INFO_MIN: 5,
  RADIO_INFO_MAX: 15,

  MEDICINE_HP: 20,
  MEDICINE_HP_INJURED: 30,
  MEDICINE_DOCTOR_HP: 30,

  GUARD_RAID_REDUCTION: 0.5,
  GUARD_MENTAL_COST: 2,

  GENERATOR_FUEL_POWER: 10,

  ITEM_BREAK_BASE: 10,
  ITEM_BREAK_OLD: 15,
  ITEM_BREAK_SEVERE: 25,

  SURVIVOR_MAX: 3,
  SURVIVOR_DEATH_MENTAL: 15,
  SURVIVOR_DEATH_TRUST: 5,

  DOCTOR_TREAT_BONUS: 10,
  ENGINEER_REPAIR_BONUS: 5,
  HUNTER_EXPLORE_BONUS: 15,
  SCOUT_JOB_BONUS: 15,
  COWARD_MENTAL_LOSS_MULT: 1.2,

  INFO_NORMAL: 5,
  INFO_IMPORTANT: 10,
  INFO_KEY: 15,
  INFO_RARE: 15,

  TRUST_HELP_MIN: 5,
  TRUST_HELP_MAX: 10,
  TRUST_LIE: -10,
  TRUST_BETRAY: -20,
  TRUST_SACRIFICE_MIN: 15,
  TRUST_SACRIFICE_MAX: 25,

  CHANCE_MIN: 5,
  CHANCE_MAX: 95,

  MAX_EVENTS_PER_DAY: 2,
  REPEATABLE_COOLDOWN_DAYS: 3,

  HP_DAMAGE_STEPS: [5, 10, 15, 20, 30, 40],
  MENTAL_DAMAGE_STEPS: [3, 5, 10, 15, 20],
  SHELTER_DAMAGE_STEPS: [5, 10, 15, 20, 30],
  RESOURCE_LOSS_STEPS: [1, 2, 3, 5],

  REWARD_NORMAL: { water: 1, food: 1, power: 5, mental: 5, hp: 5 },
  REWARD_GOOD: { water: 2, food: 2, power: 10, mental: 10, info: 10, trust: 10 },
  REWARD_RARE: { info: 15 },

  SHELTER_SAFE_MIN: 70,
  SHELTER_UNSTABLE_MIN: 40,
  SHELTER_UNSTABLE_RAID_DAMAGE_MULT: 1.1,
  SHELTER_DANGER_MIN: 20,
  SHELTER_DANGER_RAID_CHANCE_BONUS: 15,
  SHELTER_CRITICAL_RAID_DAMAGE_MULT: 1.3,
  SHELTER_COLLAPSE_HP: 20,
  SHELTER_COLLAPSE_MENTAL: 20,
  SHELTER_COLLAPSE_DEATH_DAYS: 3,

  EXPLORE_ITEM_MODIFIERS: {
    flashlight: 5,
    map: 5,
    binoculars: 5,
    axe: 5,
    walkie: 3,
  } as Record<string, number>,

  EXPLORE_JOB_MODIFIERS: {
    hunter: 15,
    engineer: 5,
    doctor: 0,
  } as Record<string, number>,

  MENTAL_EXPLORE_PENALTY: {
    stable: 0,
    tense: 0,
    anxious: -5,
    nearPanic: -10,
    panic: -15,
    breakdown: -15,
  } as Record<MentalTier, number>,

  DIFFICULTY_BY_DAY: [
    { min: 1, max: 5, bonus: 0 },
    { min: 6, max: 10, bonus: 5 },
    { min: 11, max: 15, bonus: 10 },
    { min: 16, max: 20, bonus: 15 },
    { min: 21, max: 25, bonus: 20 },
    { min: 26, max: 30, bonus: 25 },
  ],

  ENDING_TRUE_INFO: 100,
  ENDING_TRUE_RADIO_COUNT: 3,
} as const

export const LOCATIONS: Record<
  LocationId,
  { name: string; baseSuccess: number; danger: number; unlockDay: number }
> = {
  house: { name: '버려진 집', baseSuccess: 90, danger: 10, unlockDay: 1 },
  store: { name: '편의점', baseSuccess: 80, danger: 20, unlockDay: 1 },
  hospital: { name: '병원', baseSuccess: 65, danger: 40, unlockDay: 6 },
  police: { name: '경찰서', baseSuccess: 55, danger: 50, unlockDay: 6 },
  military: { name: '군부대', baseSuccess: 40, danger: 70, unlockDay: 11 },
  lab: { name: '지하 연구시설', baseSuccess: 25, danger: 90, unlockDay: 16 },
}

export function mentalTier(mental: number): MentalTier {
  if (mental >= 80) return 'stable'
  if (mental >= 60) return 'tense'
  if (mental >= 40) return 'anxious'
  if (mental >= 20) return 'nearPanic'
  if (mental >= 1) return 'panic'
  return 'breakdown'
}

export function mentalTierLabel(tier: MentalTier): string {
  switch (tier) {
    case 'stable':
      return '안정'
    case 'tense':
      return '긴장'
    case 'anxious':
      return '불안'
    case 'nearPanic':
      return '공황 직전'
    case 'panic':
      return '공황'
    case 'breakdown':
      return '정신 붕괴'
  }
}

export function difficultyBonus(day: number): number {
  const row = GAME_RULES.DIFFICULTY_BY_DAY.find((r) => day >= r.min && day <= r.max)
  return row ? row.bonus : GAME_RULES.DIFFICULTY_BY_DAY[GAME_RULES.DIFFICULTY_BY_DAY.length - 1].bonus
}

export function clampChance(value: number): number {
  return Math.max(GAME_RULES.CHANCE_MIN, Math.min(GAME_RULES.CHANCE_MAX, Math.round(value)))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}
