// 게임 전체에서 쓰는 타입 정의. 엔진(engine/)은 이 타입들만 보고 동작하고,
// UI(screens/, components/)는 GameState를 읽기 전용으로만 사용한다.

export type ItemId =
  | 'water'
  | 'can'
  | 'medicine'
  | 'bandage'
  | 'flashlight'
  | 'battery'
  | 'radio'
  | 'map'
  | 'axe'
  | 'toolbox'
  | 'blanket'
  | 'mask'
  | 'filter'
  | 'matches'
  | 'fishingRod'
  | 'seed'
  | 'walkie'
  | 'generator'
  | 'book'
  | 'photo'
  | 'knife'
  | 'binoculars'
  | 'backpack'
  | 'fuel'
  | 'repairKit'
  | 'warmMeal'

export type ActionId =
  | 'rest'
  | 'explore'
  | 'repair'
  | 'scout'
  | 'radio'
  | 'treat'
  | 'craft'
  | 'guard'

export type StatusId = 'injured' | 'dehydrated' | 'starving' | 'infected'

export type MentalTier = 'stable' | 'tense' | 'anxious' | 'nearPanic' | 'panic' | 'breakdown'

export type LocationId = 'house' | 'store' | 'hospital' | 'police' | 'military' | 'lab'

export type JobId = 'doctor' | 'engineer' | 'hunter' | 'scout' | 'civilian' | 'coward' | 'liar'

export type RoomId =
  | 'classroom'
  | 'facultyOffice'
  | 'nurseOffice'
  | 'musicRoom'
  | 'artRoom'
  | 'scienceRoom'
  | 'restroom'
  | 'danceRoom'
  | 'techRoom'

/** 준비 단계에서 방마다 흩어져 있는 개별 물건 하나. 판마다 무작위로 배치된다. */
export interface PrepPickup {
  id: string
  item: ItemId
  room: RoomId
  taken: boolean
}

/** 준비 단계에서 방에 숨어 있다가 데려올 수 있는 동료 후보. */
export interface PrepCompanion {
  id: string
  survivor: Survivor
  room: RoomId
  taken: boolean
}

export type EndingId =
  | 'true'
  | 'escape'
  | 'community'
  | 'sacrifice'
  | 'infection'
  | 'breakdown'
  | 'dehydration'
  | 'starvation'
  | 'solitude'
  | 'normal'
  | 'perfect'
  | 'shelterCollapse'
  | 'death'

export interface Survivor {
  id: string
  name: string
  job: JobId
  personality: string
  hp: number
  trust: number
  alive: boolean
  infected: boolean
}

export interface LogEntry {
  day: number
  text: string
  tag?: 'action' | 'event' | 'night' | 'system' | 'story'
}

export interface GameStats {
  hp: number
  mental: number
  water: number
  food: number
  power: number
  shelter: number
  info: number
  trust: number
  contamination: number
}

export interface GameState {
  seedLabel: string
  rngState: number
  day: number
  phase: 'prep' | 'day' | 'ended'
  actionTaken: boolean
  actionOfDay: ActionId | null
  stats: GameStats
  statusEffects: Record<StatusId, boolean>
  waterShortageStreak: number
  foodShortageStreak: number
  injuredUntreatedDays: number
  mentalBreakdownFlag: boolean
  pendingBreakdownRecovery: boolean
  shelterCollapsedDay: number | null
  scoutBonusCharges: number
  guardActiveTonight: boolean
  inventory: Partial<Record<ItemId, number>>
  prepLayout: PrepPickup[]
  prepCompanions: PrepCompanion[]
  survivors: Survivor[]
  flags: Record<string, boolean>
  counters: Record<string, number>
  exploredLocations: LocationId[]
  route: 'north' | 'south' | null
  firedEventIds: string[]
  lastFiredDay: Record<string, number>
  eventLog: LogEntry[]
  activeEventId: string | null
  queuedEventIds: string[]
  pendingChoiceResult: string | null
  ending: EndingId | null
  deathCause: string | null
  gameOverDay: number | null
  /** "동료를 보낸다" 계열 효과가 걸렸는데 생존자가 2명 이상이라, 누구를 보낼지
   * 플레이어가 직접 고를 때까지 잠시 멈춰 둔 선택 결과. */
  pendingLeaveChoice: { ops: EffectOp[]; resultText: string; logPrefix: string } | null
}

export interface RollResult {
  roll: number
  chance: number
  success: boolean
}

export type EffectOp =
  | { type: 'hp'; amount: number }
  | { type: 'mental'; amount: number }
  | { type: 'water'; amount: number }
  | { type: 'food'; amount: number }
  | { type: 'power'; amount: number }
  | { type: 'shelter'; amount: number }
  | { type: 'info'; amount: number }
  | { type: 'trust'; amount: number }
  | { type: 'contamination'; amount: number }
  | { type: 'item'; id: ItemId; amount: number }
  | { type: 'flag'; id: string; value?: boolean }
  | { type: 'counter'; id: string; amount: number }
  | { type: 'status'; id: StatusId; value: boolean }
  | { type: 'survivorTrust'; target: 'random' | 'all'; amount: number }
  | { type: 'survivorHp'; target: 'random' | 'all'; amount: number }
  | { type: 'survivorJoin'; job?: JobId }
  | { type: 'survivorLeave' }
  | { type: 'survivorLeaveTarget'; id: string }
  | { type: 'route'; value: 'north' | 'south' }
  | { type: 'scoutConsume' }

export interface ChoiceRequirement {
  item?: ItemId
  flag?: string
  flagAbsent?: string
  survivor?: boolean
  survivorJob?: JobId
  trustMin?: number
  infoMin?: number
  routeIs?: 'north' | 'south'
}

export interface GameChoice {
  id: string
  label: string
  requires?: ChoiceRequirement
  hint?: string
  /** 확정 결과 (확률 판정 없음) */
  effects?: EffectOp[]
  resultText?: string
  /** 확률 판정 결과 (5~95% 클램프) */
  chance?: number
  chanceFn?: (state: GameState) => number
  success?: EffectOp[]
  successText?: string
  fail?: EffectOp[]
  failText?: string
}

export interface GameEvent {
  id: string
  dayMin: number
  dayMax: number
  title: string
  description: string
  category: 'survival' | 'resource' | 'danger' | 'story' | 'rare'
  fixed?: boolean
  repeatable?: boolean
  cooldownDays?: number
  requires?: (state: GameState) => boolean
  choices: GameChoice[]
}
