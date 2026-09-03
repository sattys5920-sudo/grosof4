// 게임의 심장부. UI는 이 모듈이 내보내는 함수만 호출하고, 그 결과로 받은
// GameState를 그대로 화면에 반영한다 — 내부 수치와 UI 표시가 항상 같아야 한다는
// 기획서 25번 원칙을 지키기 위해, "표시용" 값을 따로 계산하지 않는다.
import { c, flag, hp, mental, survivorLeave } from './effects'
import { CRAFT_RECIPES, ITEMS, PREP_ITEM_ORDER } from './items'
import { LOCATION_REWARDS, RISK_OUTCOME_WEIGHTS, type RiskOutcome } from './locations'
import { ROOMS } from './rooms'
import { Rng, freshSeed, resolveChance } from './rng'
import { GAME_RULES, LOCATIONS, clamp, clampChance, difficultyBonus, mentalTier } from './rules'
import { saveGame } from './save'
import { generateSurvivor } from './survivors'
import { ALL_EVENTS, EVENT_MAP } from './events'
import { endingForDeathCause, evaluateSurvivalEnding } from './endings'
import type {
  ActionId,
  ChoiceRequirement,
  EffectOp,
  GameChoice,
  GameEvent,
  GameState,
  ItemId,
  LocationId,
  PrepCompanion,
  PrepPickup,
} from './types'

export interface ActionParams {
  location?: LocationId
  itemUsed?: 'medicine' | 'bandage'
  target?: 'self' | string
  recipeId?: string
}

export const DAY30_EVENT: GameEvent = {
  id: 'day30-final',
  dayMin: 30,
  dayMax: 30,
  title: '30일째',
  description:
    '문밖에서 조용한 목소리가 들린다. "이제 문을 열어도 됩니다." 30일 동안의 기억이 한꺼번에 스친다.',
  category: 'story',
  choices: [
    c('holdDoor', '문을 열지 않는다', [flag('doorHeldFinal')], '벽에 남아 있던 경고를 마지막까지 믿기로 했다.'),
    c('openDoor', '문을 연다', [flag('doorOpenedFinal'), hp(-10)], '문을 열자 눈부신 빛이 쏟아져 들어왔다.'),
    c(
      'finalSacrifice',
      '동료를 남기고 홀로 나간다',
      [flag('survivorSacrificed'), survivorLeave(), mental(-10)],
      '함께 버텨온 이와 여기서 작별했다.',
      { survivor: true },
    ),
  ],
}

function getEvent(id: string): GameEvent | undefined {
  return id === DAY30_EVENT.id ? DAY30_EVENT : EVENT_MAP[id]
}

/** UI와 테스트 양쪽에서 "지금 뜬 이벤트가 뭔지" 조회할 때 쓴다. */
export function getActiveEvent(state: GameState): GameEvent | undefined {
  return state.activeEventId ? getEvent(state.activeEventId) : undefined
}

function withRng(state: GameState, fn: (rng: Rng, state: GameState) => GameState): GameState {
  const rng = new Rng(state.rngState)
  const next = fn(rng, state)
  return { ...next, rngState: rng.state }
}

// ============================== 용량 ==============================
export function capacity(state: GameState): number {
  return GAME_RULES.BASE_CAPACITY + ((state.inventory.backpack ?? 0) > 0 ? GAME_RULES.BACKPACK_BONUS : 0)
}

export function usedCapacity(state: GameState): number {
  const itemSpace = (Object.keys(state.inventory) as ItemId[]).reduce(
    (sum, id) => sum + (state.inventory[id] ?? 0) * ITEMS[id].space,
    0,
  )
  return state.stats.water + state.stats.food + itemSpace
}

export function remainingCapacity(state: GameState): number {
  return capacity(state) - usedCapacity(state)
}

// ============================== 효과 적용 ==============================
// applyEffects/checkDeath는 UI가 아니라 테스트(section 42 자동 검증)를 위해서도
// export한다 — 실제 게임 로직과 같은 함수로 검증해야 의미가 있기 때문이다.
export function applyEffects(state: GameState, ops: EffectOp[], rng: Rng): { state: GameState; notes: string[] } {
  const stats = { ...state.stats }
  const statusEffects = { ...state.statusEffects }
  const inventory = { ...state.inventory }
  const flags = { ...state.flags }
  const counters = { ...state.counters }
  const survivors = state.survivors.map((sv) => ({ ...sv }))
  let route = state.route
  let shelterCollapsedDay = state.shelterCollapsedDay
  let mentalBreakdownFlag = state.mentalBreakdownFlag
  let pendingBreakdownRecovery = state.pendingBreakdownRecovery
  const notes: string[] = []

  const cap = GAME_RULES.BASE_CAPACITY + ((inventory.backpack ?? 0) > 0 ? GAME_RULES.BACKPACK_BONUS : 0)
  const usedCap = () =>
    stats.water + stats.food + (Object.keys(inventory) as ItemId[]).reduce((sum, id) => sum + (inventory[id] ?? 0) * ITEMS[id].space, 0)

  function addResource(kind: 'water' | 'food', amount: number) {
    const max = kind === 'water' ? GAME_RULES.MAX_WATER : GAME_RULES.MAX_FOOD
    if (amount <= 0) {
      stats[kind] = clamp(stats[kind] + amount, 0, max)
      return
    }
    const room = cap - usedCap()
    const grant = Math.max(0, Math.min(amount, room))
    if (grant < amount) notes.push('공간이 부족해 일부를 챙기지 못했다.')
    stats[kind] = clamp(stats[kind] + grant, 0, max)
  }

  function addItem(id: ItemId, amount: number) {
    if (amount <= 0) {
      const next = Math.max(0, (inventory[id] ?? 0) + amount)
      if (next === 0) delete inventory[id]
      else inventory[id] = next
      return
    }
    const space = ITEMS[id].space
    const room = cap - usedCap()
    const affordable = Math.max(0, Math.min(amount, Math.floor(room / space)))
    if (affordable < amount) notes.push('공간이 부족해 일부를 챙기지 못했다.')
    if (affordable > 0) inventory[id] = (inventory[id] ?? 0) + affordable
  }

  for (const op of ops) {
    switch (op.type) {
      case 'hp':
        stats.hp = clamp(stats.hp + op.amount, 0, GAME_RULES.MAX_HP)
        break
      case 'mental': {
        const next = clamp(stats.mental + op.amount, 0, GAME_RULES.MAX_MENTAL)
        stats.mental = next
        if (next <= 0) {
          mentalBreakdownFlag = true
          pendingBreakdownRecovery = true
        }
        break
      }
      case 'water':
        addResource('water', op.amount)
        break
      case 'food':
        addResource('food', op.amount)
        break
      case 'power':
        stats.power = clamp(stats.power + op.amount, 0, GAME_RULES.MAX_POWER)
        break
      case 'shelter': {
        const prev = stats.shelter
        const next = clamp(prev + op.amount, 0, GAME_RULES.MAX_SHELTER)
        stats.shelter = next
        if (prev > 0 && next <= 0) {
          stats.hp = clamp(stats.hp - GAME_RULES.SHELTER_COLLAPSE_HP, 0, GAME_RULES.MAX_HP)
          stats.mental = clamp(stats.mental - GAME_RULES.SHELTER_COLLAPSE_MENTAL, 0, GAME_RULES.MAX_MENTAL)
          shelterCollapsedDay = state.day
          notes.push('대피소가 무너졌다.')
        } else if (next > 0 && shelterCollapsedDay != null) {
          shelterCollapsedDay = null
        }
        break
      }
      case 'info':
        stats.info = clamp(stats.info + op.amount, 0, GAME_RULES.MAX_INFO)
        break
      case 'trust':
        stats.trust = clamp(stats.trust + op.amount, 0, GAME_RULES.MAX_TRUST)
        break
      case 'contamination':
        stats.contamination = clamp(stats.contamination + op.amount, 0, GAME_RULES.MAX_CONTAMINATION)
        break
      case 'item':
        addItem(op.id, op.amount)
        break
      case 'flag':
        flags[op.id] = op.value ?? true
        break
      case 'counter':
        counters[op.id] = (counters[op.id] ?? 0) + op.amount
        break
      case 'status':
        statusEffects[op.id] = op.value
        break
      case 'survivorTrust': {
        const pool = survivors.filter((sv) => sv.alive)
        const targets = op.target === 'all' ? pool : pool.length > 0 ? [rng.pick(pool)] : []
        for (const t of targets) {
          const sv = survivors.find((s) => s.id === t.id)
          if (sv) sv.trust = clamp(sv.trust + op.amount, 0, 100)
        }
        break
      }
      case 'survivorHp': {
        const pool = survivors.filter((sv) => sv.alive)
        const targets = op.target === 'all' ? pool : pool.length > 0 ? [rng.pick(pool)] : []
        for (const t of targets) {
          const sv = survivors.find((s) => s.id === t.id)
          if (!sv) continue
          sv.hp = clamp(sv.hp + op.amount, 0, 100)
          if (sv.hp <= 0 && sv.alive) {
            sv.alive = false
            stats.mental = clamp(stats.mental - GAME_RULES.SURVIVOR_DEATH_MENTAL, 0, GAME_RULES.MAX_MENTAL)
            for (const other of survivors) {
              if (other.alive && other.id !== sv.id) other.trust = clamp(other.trust - GAME_RULES.SURVIVOR_DEATH_TRUST, 0, 100)
            }
            notes.push(`${sv.name}이(가) 세상을 떠났다.`)
          }
        }
        break
      }
      case 'survivorJoin': {
        const aliveCount = survivors.filter((sv) => sv.alive).length
        if (aliveCount < GAME_RULES.SURVIVOR_MAX) {
          const generated = generateSurvivor(rng, survivors.map((sv) => sv.name))
          const newSurvivor = op.job ? { ...generated, job: op.job } : generated
          survivors.push(newSurvivor)
          notes.push(`${newSurvivor.name}(이)가 합류했다.`)
        } else {
          notes.push('더 이상 함께할 자리가 없다.')
        }
        break
      }
      case 'survivorLeave': {
        const pool = survivors.filter((sv) => sv.alive)
        if (pool.length > 0) {
          const target = rng.pick(pool)
          const sv = survivors.find((s) => s.id === target.id)
          if (sv) {
            sv.alive = false
            notes.push(`${sv.name}(이)가 떠났다.`)
          }
        }
        break
      }
      case 'survivorLeaveTarget': {
        const sv = survivors.find((s) => s.id === op.id && s.alive)
        if (sv) {
          sv.alive = false
          notes.push(`${sv.name}(이)가 떠났다.`)
        }
        break
      }
      case 'route':
        route = op.value
        break
      case 'scoutConsume':
        break
    }
  }

  const next: GameState = {
    ...state,
    stats,
    statusEffects,
    inventory,
    flags,
    counters,
    survivors,
    route,
    shelterCollapsedDay,
    mentalBreakdownFlag,
    pendingBreakdownRecovery,
  }
  return { state: next, notes }
}

function log(state: GameState, text: string, tag: NonNullable<GameState['eventLog'][number]['tag']> = 'system'): GameState {
  return { ...state, eventLog: [...state.eventLog, { day: state.day, text, tag }] }
}

function logNotes(state: GameState, notes: string[]): GameState {
  let s = state
  for (const n of notes) s = log(s, n, 'system')
  return s
}

// ============================== 사망 판정 ==============================
function finalizeDeath(state: GameState, cause: string): GameState {
  const result = endingForDeathCause(cause)
  return log(
    { ...state, phase: 'ended', ending: result.id, deathCause: cause, gameOverDay: state.day, activeEventId: null, queuedEventIds: [] },
    `${state.day}일째, ${result.title}.`,
    'system',
  )
}

export function checkDeath(state: GameState): GameState {
  if (state.phase === 'ended') return state
  if (state.waterShortageStreak >= GAME_RULES.WATER_DEATH_STREAK) return finalizeDeath(state, 'dehydration')
  if (state.foodShortageStreak >= GAME_RULES.FOOD_DEATH_STREAK) return finalizeDeath(state, 'starvation')
  if (state.stats.hp <= 0) return finalizeDeath(state, state.statusEffects.infected ? 'infection' : 'death')
  if (
    state.shelterCollapsedDay != null &&
    state.stats.shelter <= 0 &&
    state.day - state.shelterCollapsedDay >= GAME_RULES.SHELTER_COLLAPSE_DEATH_DAYS
  ) {
    return finalizeDeath(state, 'shelterCollapse')
  }
  return state
}

function finalizeGame(state: GameState): GameState {
  const result = evaluateSurvivalEnding(state)
  return log(
    { ...state, phase: 'ended', ending: result.id, gameOverDay: state.day, activeEventId: null, queuedEventIds: [] },
    `30일째, ${result.title}.`,
    'system',
  )
}

// ============================== 아침 ==============================
export function applyMorning(state: GameState): GameState {
  const survivorCount = state.survivors.filter((sv) => sv.alive).length
  const waterNeed = GAME_RULES.DAILY_WATER * (1 + survivorCount)
  const foodNeed = GAME_RULES.DAILY_FOOD * (1 + survivorCount)
  const waterOk = state.stats.water >= waterNeed
  const foodOk = state.stats.food >= foodNeed

  const stats = {
    ...state.stats,
    water: Math.max(0, state.stats.water - waterNeed),
    food: Math.max(0, state.stats.food - foodNeed),
  }
  const statusEffects = { ...state.statusEffects }
  const notes: string[] = []

  if (!waterOk) {
    stats.hp = clamp(stats.hp - GAME_RULES.WATER_ZERO_HP - GAME_RULES.DEHYDRATION_DAILY_HP, 0, GAME_RULES.MAX_HP)
    stats.mental = clamp(stats.mental - GAME_RULES.WATER_ZERO_MENTAL, 0, GAME_RULES.MAX_MENTAL)
    statusEffects.dehydrated = true
    notes.push('물이 부족했다. 체력과 정신력이 줄었다.')
  } else {
    statusEffects.dehydrated = false
  }

  if (!foodOk) {
    stats.hp = clamp(stats.hp - GAME_RULES.FOOD_ZERO_HP - GAME_RULES.STARVATION_DAILY_HP, 0, GAME_RULES.MAX_HP)
    stats.mental = clamp(stats.mental - GAME_RULES.FOOD_ZERO_MENTAL, 0, GAME_RULES.MAX_MENTAL)
    statusEffects.starving = true
    notes.push('식량이 부족했다. 체력과 정신력이 줄었다.')
  } else {
    statusEffects.starving = false
  }

  let injuredUntreatedDays = state.injuredUntreatedDays
  if (statusEffects.injured) {
    injuredUntreatedDays += 1
    if (injuredUntreatedDays >= GAME_RULES.INJURY_UNTREATED_START_DAY) {
      stats.hp = clamp(stats.hp - GAME_RULES.INJURY_UNTREATED_HP, 0, GAME_RULES.MAX_HP)
      notes.push('치료하지 않은 부상이 계속 덧났다.')
    }
  } else {
    injuredUntreatedDays = 0
  }

  if (stats.contamination >= GAME_RULES.CONTAMINATION_HP_THRESHOLD) {
    stats.hp = clamp(stats.hp - GAME_RULES.CONTAMINATION_HP_DAILY, 0, GAME_RULES.MAX_HP)
    notes.push('오염이 몸을 갉아먹고 있다.')
  }
  if (stats.contamination >= GAME_RULES.CONTAMINATION_INFECT_THRESHOLD && !statusEffects.infected) {
    statusEffects.infected = true
    notes.push('결국 감염되고 말았다.')
  }

  let mentalValue = stats.mental
  let pendingBreakdownRecovery = state.pendingBreakdownRecovery
  if (pendingBreakdownRecovery) {
    mentalValue = 20
    pendingBreakdownRecovery = false
    notes.push('겨우 정신을 추슬렀다.')
  }

  const next: GameState = {
    ...state,
    stats: { ...stats, mental: mentalValue },
    statusEffects,
    waterShortageStreak: waterOk ? 0 : state.waterShortageStreak + 1,
    foodShortageStreak: foodOk ? 0 : state.foodShortageStreak + 1,
    injuredUntreatedDays,
    pendingBreakdownRecovery,
  }
  return logNotes(log(next, `${next.day}일째 아침이 밝았다.`, 'system'), notes)
}

// ============================== 준비 단계 ==============================
// 방마다 흩어질 물건 목록을 만든다. 물/식량은 각각 최대 10개까지 낱개로
// 흩어지고, 나머지 장비는 전개도 어딘가에 딱 하나씩만 있다. 판이 새로
// 시작될 때마다(=createInitialState 호출마다) 배치가 다시 섞인다.
function buildPrepLayout(rng: Rng): PrepPickup[] {
  const pool: ItemId[] = []
  for (const id of PREP_ITEM_ORDER) {
    if (id === 'water') {
      for (let i = 0; i < GAME_RULES.PREP_WATER_COUNT; i++) pool.push('water')
    } else if (id === 'can') {
      for (let i = 0; i < GAME_RULES.PREP_FOOD_COUNT; i++) pool.push('can')
    } else {
      pool.push(id)
    }
  }
  const seen: Partial<Record<ItemId, number>> = {}
  return pool.map((item) => {
    const idx = seen[item] ?? 0
    seen[item] = idx + 1
    return { id: `${item}-${idx}`, item, room: rng.pick(ROOMS).id, taken: false }
  })
}

// 방 어딘가에 숨어 있다가 데려올 수 있는 동료 후보 3명을 만든다.
function buildPrepCompanions(rng: Rng): PrepCompanion[] {
  const companions: PrepCompanion[] = []
  const usedNames: string[] = []
  for (let i = 0; i < 3; i++) {
    const survivor = generateSurvivor(rng, usedNames)
    usedNames.push(survivor.name)
    companions.push({ id: `companion-${i}`, survivor, room: rng.pick(ROOMS).id, taken: false })
  }
  return companions
}

export function createInitialState(): GameState {
  const rng = new Rng(freshSeed())
  const prepLayout = buildPrepLayout(rng)
  const prepCompanions = buildPrepCompanions(rng)
  return {
    seedLabel: 'run',
    rngState: rng.state,
    day: 0,
    phase: 'prep',
    actionTaken: false,
    actionOfDay: null,
    stats: {
      hp: GAME_RULES.START_HP,
      mental: GAME_RULES.START_MENTAL,
      water: GAME_RULES.START_WATER,
      food: GAME_RULES.START_FOOD,
      power: GAME_RULES.START_POWER,
      shelter: GAME_RULES.START_SHELTER,
      info: GAME_RULES.START_INFO,
      trust: GAME_RULES.START_TRUST,
      contamination: 0,
    },
    statusEffects: { injured: false, dehydrated: false, starving: false, infected: false },
    waterShortageStreak: 0,
    foodShortageStreak: 0,
    injuredUntreatedDays: 0,
    mentalBreakdownFlag: false,
    pendingBreakdownRecovery: false,
    shelterCollapsedDay: null,
    scoutBonusCharges: 0,
    guardActiveTonight: false,
    inventory: {},
    prepLayout,
    prepCompanions,
    survivors: [],
    flags: {},
    counters: {},
    exploredLocations: [],
    route: null,
    firedEventIds: [],
    lastFiredDay: {},
    eventLog: [{ day: 0, text: '경보가 울린다. 60초 안에 챙길 것을 정해야 한다.', tag: 'system' }],
    activeEventId: null,
    queuedEventIds: [],
    pendingChoiceResult: null,
    ending: null,
    deathCause: null,
    gameOverDay: null,
    pendingLeaveChoice: null,
  }
}

export function pickPrepItem(state: GameState, pickupId: string): GameState {
  if (state.phase !== 'prep') return state
  const pickup = state.prepLayout.find((p) => p.id === pickupId)
  if (!pickup || pickup.taken) return state
  const def = ITEMS[pickup.item]
  if (usedCapacity(state) + def.space > capacity(state)) return state

  const prepLayout = state.prepLayout.map((p) => (p.id === pickupId ? { ...p, taken: true } : p))
  if (pickup.item === 'water') return { ...state, prepLayout, stats: { ...state.stats, water: state.stats.water + 1 } }
  if (pickup.item === 'can') return { ...state, prepLayout, stats: { ...state.stats, food: state.stats.food + 1 } }
  return { ...state, prepLayout, inventory: { ...state.inventory, [pickup.item]: (state.inventory[pickup.item] ?? 0) + 1 } }
}

export function unpickPrepItem(state: GameState, pickupId: string): GameState {
  if (state.phase !== 'prep') return state
  const pickup = state.prepLayout.find((p) => p.id === pickupId)
  if (!pickup || !pickup.taken) return state

  const prepLayout = state.prepLayout.map((p) => (p.id === pickupId ? { ...p, taken: false } : p))
  if (pickup.item === 'water') return { ...state, prepLayout, stats: { ...state.stats, water: Math.max(0, state.stats.water - 1) } }
  if (pickup.item === 'can') return { ...state, prepLayout, stats: { ...state.stats, food: Math.max(0, state.stats.food - 1) } }
  const inventory = { ...state.inventory }
  const next = (inventory[pickup.item] ?? 0) - 1
  if (next <= 0) delete inventory[pickup.item]
  else inventory[pickup.item] = next
  return { ...state, prepLayout, inventory }
}

export function pickPrepCompanion(state: GameState, companionId: string): GameState {
  if (state.phase !== 'prep') return state
  const companion = state.prepCompanions.find((c) => c.id === companionId)
  if (!companion || companion.taken) return state
  if (state.survivors.filter((sv) => sv.alive).length >= GAME_RULES.SURVIVOR_MAX) return state
  const prepCompanions = state.prepCompanions.map((c) => (c.id === companionId ? { ...c, taken: true } : c))
  return { ...state, prepCompanions, survivors: [...state.survivors, companion.survivor] }
}

export function unpickPrepCompanion(state: GameState, companionId: string): GameState {
  if (state.phase !== 'prep') return state
  const companion = state.prepCompanions.find((c) => c.id === companionId)
  if (!companion || !companion.taken) return state
  const prepCompanions = state.prepCompanions.map((c) => (c.id === companionId ? { ...c, taken: false } : c))
  const survivors = state.survivors.filter((sv) => sv.id !== companion.survivor.id)
  return { ...state, prepCompanions, survivors }
}

// ============================== 물/식량 즉시 사용 ==============================
// 하루의 주요 행동과는 별개로, 언제든 클릭해서 바로 마시거나 먹을 수 있다.
export function useWater(state: GameState): GameState {
  if (state.phase !== 'day' || state.activeEventId || state.stats.water <= 0) return state
  const stats = { ...state.stats, water: state.stats.water - 1, hp: clamp(state.stats.hp + 3, 0, GAME_RULES.MAX_HP) }
  const statusEffects = { ...state.statusEffects, dehydrated: false }
  return log({ ...state, stats, statusEffects }, '물을 마셨다. 체력 +3.', 'action')
}

export function useFood(state: GameState): GameState {
  if (state.phase !== 'day' || state.activeEventId || state.stats.food <= 0) return state
  const stats = { ...state.stats, food: state.stats.food - 1, hp: clamp(state.stats.hp + 3, 0, GAME_RULES.MAX_HP) }
  const statusEffects = { ...state.statusEffects, starving: false }
  return log({ ...state, stats, statusEffects }, '식량을 먹었다. 체력 +3.', 'action')
}

export function finalizePrep(state: GameState): GameState {
  if (state.phase !== 'prep') return state
  const started: GameState = { ...state, phase: 'day', day: 1 }
  return applyMorning(started)
}

// ============================== 요구조건 ==============================
export function requirementMet(state: GameState, req?: ChoiceRequirement): boolean {
  if (!req) return true
  if (req.item && (state.inventory[req.item] ?? 0) <= 0) return false
  if (req.flag && state.flags[req.flag] !== true) return false
  if (req.flagAbsent && state.flags[req.flagAbsent] === true) return false
  if (req.survivor && !state.survivors.some((s) => s.alive)) return false
  if (req.survivorJob && !state.survivors.some((s) => s.alive && s.job === req.survivorJob)) return false
  if (req.trustMin != null) {
    const alive = state.survivors.filter((s) => s.alive)
    const avg = alive.length > 0 ? alive.reduce((a, s) => a + s.trust, 0) / alive.length : 0
    if (avg < req.trustMin) return false
  }
  if (req.infoMin != null && state.stats.info < req.infoMin) return false
  if (req.routeIs && state.route !== req.routeIs) return false
  return true
}

export function enabledChoices(state: GameState, event: GameEvent): GameChoice[] {
  return event.choices.filter((ch) => requirementMet(state, ch.requires))
}

function eventHasEnabledChoice(state: GameState, event: GameEvent): boolean {
  return event.choices.some((ch) => requirementMet(state, ch.requires))
}

// ============================== 이벤트 선택 ==============================
const CATEGORY_WEIGHTS: Record<GameEvent['category'], number> = { survival: 50, resource: 20, danger: 15, story: 10, rare: 5 }
const CATEGORY_ORDER: GameEvent['category'][] = ['survival', 'resource', 'danger', 'story', 'rare']

function pickWeightedEvent(pool: GameEvent[], rng: Rng): GameEvent | null {
  if (pool.length === 0) return null
  const roll = rng.roll100()
  let acc = 0
  let chosen: GameEvent['category'] = 'survival'
  for (const cat of CATEGORY_ORDER) {
    acc += CATEGORY_WEIGHTS[cat]
    if (roll < acc) {
      chosen = cat
      break
    }
  }
  const inCat = pool.filter((e) => e.category === chosen)
  return rng.pick(inCat.length > 0 ? inCat : pool)
}

function eligibleEvents(state: GameState, excludeIds: string[], fixedOnly: boolean): GameEvent[] {
  return ALL_EVENTS.filter((e) => {
    if (excludeIds.includes(e.id)) return false
    if (fixedOnly ? !e.fixed : !!e.fixed) return false
    if (state.day < e.dayMin || state.day > e.dayMax) return false
    if (e.requires && !e.requires(state)) return false
    if (!eventHasEnabledChoice(state, e)) return false
    if (state.firedEventIds.includes(e.id)) {
      if (!e.repeatable) return false
      const last = state.lastFiredDay[e.id]
      const cooldown = e.cooldownDays ?? GAME_RULES.REPEATABLE_COOLDOWN_DAYS
      if (last != null && state.day - last < cooldown) return false
    }
    return true
  })
}

function pickOneEvent(state: GameState, rng: Rng, excludeIds: string[]): GameEvent | null {
  const fixedPool = eligibleEvents(state, excludeIds, true)
  if (fixedPool.length > 0) return rng.pick(fixedPool)
  const randomPool = eligibleEvents(state, excludeIds, false)
  return pickWeightedEvent(randomPool, rng)
}

const MAJOR_FLAGS = ['doorWarning', 'blackBox', 'truthDoor', 'finalBroadcast', 'militaryRecord', 'labExplored']

function shouldQueueSecondEvent(state: GameState): boolean {
  let count = 0
  if (state.stats.mental <= 30) count++
  if (state.stats.hp <= 30) count++
  if (state.stats.water <= 1) count++
  if (state.stats.food <= 1) count++
  if (state.stats.shelter <= 30) count++
  if (state.survivors.filter((s) => s.alive).length >= 2) count++
  if (MAJOR_FLAGS.some((f) => state.flags[f])) count++
  return count >= 2
}

function queueEventsForDay(state: GameState, rng: Rng): GameState {
  const first = pickOneEvent(state, rng, [])
  if (!first) return { ...state, activeEventId: null, queuedEventIds: [] }
  const ids = [first.id]
  let s = {
    ...state,
    firedEventIds: [...state.firedEventIds, first.id],
    lastFiredDay: { ...state.lastFiredDay, [first.id]: state.day },
  }
  if (shouldQueueSecondEvent(state)) {
    const second = pickOneEvent(s, rng, ids)
    if (second) {
      ids.push(second.id)
      s = { ...s, firedEventIds: [...s.firedEventIds, second.id], lastFiredDay: { ...s.lastFiredDay, [second.id]: s.day } }
    }
  }
  return { ...s, activeEventId: ids[0], queuedEventIds: ids.slice(1) }
}

// ============================== 밤 ==============================
function resolveNight(state: GameState, rng: Rng): GameState {
  const shelterStat = state.stats.shelter
  const tier =
    shelterStat >= GAME_RULES.SHELTER_SAFE_MIN
      ? 'safe'
      : shelterStat >= GAME_RULES.SHELTER_UNSTABLE_MIN
        ? 'unstable'
        : shelterStat >= GAME_RULES.SHELTER_DANGER_MIN
          ? 'danger'
          : 'critical'
  const diff = difficultyBonus(state.day)
  const raidChance = clampChance((GAME_RULES.RAID_BASE_CHANCE[tier] ?? 10) + diff / 2)
  const { success: raided } = resolveChance(rng, raidChance)
  if (!raided) return { ...state, guardActiveTonight: false }

  const mult =
    tier === 'unstable'
      ? GAME_RULES.SHELTER_UNSTABLE_RAID_DAMAGE_MULT
      : tier === 'critical'
        ? GAME_RULES.SHELTER_CRITICAL_RAID_DAMAGE_MULT
        : 1
  const guardMult = state.guardActiveTonight ? GAME_RULES.GUARD_RAID_REDUCTION : 1
  const shelterDamage = Math.round(GAME_RULES.RAID_SHELTER_DAMAGE * mult * guardMult)
  const ops: EffectOp[] = [{ type: 'shelter', amount: -shelterDamage }]
  const { success: hitPlayer } = resolveChance(rng, GAME_RULES.RAID_HP_CHANCE)
  if (hitPlayer) ops.push({ type: 'hp', amount: -Math.round(GAME_RULES.RAID_HP_DAMAGE * guardMult) })

  const applied = applyEffects(state, ops, rng)
  let s = logNotes(applied.state, applied.notes)
  s = log(s, state.guardActiveTonight ? '밤사이 습격이 있었지만 경계 덕에 피해를 줄였다.' : '밤사이 습격이 있었다.', 'night')
  return { ...s, guardActiveTonight: false }
}

function endDay(state: GameState): GameState {
  const newDay = state.day + 1
  let s: GameState = { ...state, day: newDay, actionTaken: false, actionOfDay: null, activeEventId: null, queuedEventIds: [] }
  s = applyMorning(s)
  s = checkDeath(s)
  if (s.phase === 'ended') {
    saveGame(s)
    return s
  }
  if (s.day >= 30) s = { ...s, activeEventId: DAY30_EVENT.id }
  saveGame(s)
  return s
}

// ============================== 행동 ==============================
function pickWeighted(table: { outcome: RiskOutcome; weight: number }[], rng: Rng): RiskOutcome {
  const total = table.reduce((sum, t) => sum + t.weight, 0)
  let roll = rng.next() * total
  for (const t of table) {
    if (roll < t.weight) return t.outcome
    roll -= t.weight
  }
  return table[table.length - 1].outcome
}

function breakRandomItem(state: GameState, rng: Rng): { state: GameState; note: string } {
  const keys = (Object.keys(state.inventory) as ItemId[]).filter((k) => (state.inventory[k] ?? 0) > 0)
  if (keys.length === 0) return { state, note: '다행히 장비 파손은 없었다.' }
  const target = rng.pick(keys)
  const applied = applyEffects(state, [{ type: 'item', id: target, amount: -1 }], rng)
  return { state: applied.state, note: `${ITEMS[target].name}이(가) 파손됐다.` }
}

function resolveExplore(state: GameState, loc: LocationId, rng: Rng): { state: GameState; notes: string[] } {
  const location = LOCATIONS[loc]
  const notes: string[] = []
  const itemMod = Object.entries(GAME_RULES.EXPLORE_ITEM_MODIFIERS).reduce(
    (sum, [key, val]) => sum + ((state.inventory[key as ItemId] ?? 0) > 0 ? val : 0),
    0,
  )
  const jobMod = state.survivors
    .filter((sv) => sv.alive)
    .reduce((sum, sv) => sum + (GAME_RULES.EXPLORE_JOB_MODIFIERS[sv.job] ?? 0), 0)
  const scoutMod = state.scoutBonusCharges > 0 ? state.scoutBonusCharges : 0
  const mMod = GAME_RULES.MENTAL_EXPLORE_PENALTY[mentalTier(state.stats.mental)]
  const injuryMod = state.statusEffects.injured ? -GAME_RULES.INJURY_EXPLORE_PENALTY : 0
  const diff = difficultyBonus(state.day)
  const successChance = clampChance(location.baseSuccess + itemMod + jobMod + scoutMod + mMod + injuryMod - diff)

  const { success } = resolveChance(rng, successChance)
  let s: GameState = {
    ...state,
    scoutBonusCharges: 0,
    exploredLocations: state.exploredLocations.includes(loc) ? state.exploredLocations : [...state.exploredLocations, loc],
  }

  if (success) {
    const rewardTable = LOCATION_REWARDS[loc]
    const count = 1 + rng.intBelow(3)
    const ops: EffectOp[] = []
    for (let i = 0; i < count; i++) ops.push({ type: 'item', id: rng.pick(rewardTable.items), amount: 1 })
    if (rewardTable.water > 0) ops.push({ type: 'water', amount: rewardTable.water })
    if (rewardTable.food > 0) ops.push({ type: 'food', amount: rewardTable.food })
    if (loc === 'lab') ops.push({ type: 'flag', id: 'labExplored' })
    if (rewardTable.rareFlag && rng.roll100() < (rewardTable.rareChance ?? 0)) ops.push({ type: 'flag', id: rewardTable.rareFlag })
    const applied = applyEffects(s, ops, rng)
    s = applied.state
    notes.push(...applied.notes, `${location.name} 탐색에 성공했다.`)
  } else {
    const itemRisk = ((state.inventory.flashlight ?? 0) > 0 ? 5 : 0) + ((state.inventory.axe ?? 0) > 0 || (state.inventory.knife ?? 0) > 0 ? 5 : 0)
    const scoutRisk = scoutMod > 0 ? GAME_RULES.SCOUT_EVENT_RISK_REDUCTION : 0
    const riskChance = clampChance(location.danger + diff - itemRisk - scoutRisk)
    const { success: riskHit } = resolveChance(rng, riskChance)
    if (riskHit) {
      const outcome = pickWeighted(RISK_OUTCOME_WEIGHTS, rng)
      if (outcome === 'hp') {
        const applied = applyEffects(s, [{ type: 'hp', amount: -GAME_RULES.HP_DAMAGE_STEPS[1] }], rng)
        s = applied.state
        notes.push(...applied.notes, '탐색 중 다쳤다.')
      } else if (outcome === 'mental') {
        const applied = applyEffects(s, [{ type: 'mental', amount: -GAME_RULES.MENTAL_DAMAGE_STEPS[1] }], rng)
        s = applied.state
        notes.push(...applied.notes, '탐색 중 크게 놀랐다.')
      } else if (outcome === 'itemBreak') {
        const broken = breakRandomItem(s, rng)
        s = broken.state
        notes.push(broken.note)
      } else {
        const applied = applyEffects(s, [{ type: 'status', id: 'injured', value: true }], rng)
        s = applied.state
        notes.push(...applied.notes, '탐색 중 부상을 입었다.')
      }
    } else {
      notes.push(`${location.name} 탐색에 실패했지만 다행히 무사했다.`)
    }
  }
  return { state: s, notes }
}

function resolveRepair(state: GameState, rng: Rng): { state: GameState; notes: string[] } {
  const hasToolbox = (state.inventory.toolbox ?? 0) > 0
  const hasEngineer = state.survivors.some((sv) => sv.alive && sv.job === 'engineer')
  let amount = GAME_RULES.REPAIR_SHELTER + (hasToolbox ? GAME_RULES.REPAIR_TOOLBOX_BONUS : 0)
  if (hasEngineer) amount = Math.round(amount * GAME_RULES.REPAIR_ENGINEER_MULT)
  const ops: EffectOp[] = [{ type: 'shelter', amount }]
  const hasRepairKit = (state.inventory.repairKit ?? 0) > 0
  if (hasRepairKit) {
    ops.push({ type: 'shelter', amount: 10 })
    ops.push({ type: 'item', id: 'repairKit', amount: -1 })
  }
  const applied = applyEffects(state, ops, rng)
  const total = amount + (hasRepairKit ? 10 : 0)
  return { state: applied.state, notes: [...applied.notes, `수리로 대피소 내구도 +${total}.`] }
}

function resolveTreat(state: GameState, params: ActionParams): { state: GameState; notes: string[] } {
  const itemUsed = params.itemUsed
  const targetId = params.target ?? 'self'
  if (!itemUsed || (state.inventory[itemUsed] ?? 0) <= 0) return { state, notes: ['사용할 치료 아이템이 없다.'] }

  if (itemUsed === 'medicine') {
    const hasDoctor = state.survivors.some((sv) => sv.alive && sv.job === 'doctor')
    const healAmount = hasDoctor
      ? GAME_RULES.MEDICINE_DOCTOR_HP
      : targetId === 'self' && state.statusEffects.injured
        ? GAME_RULES.MEDICINE_HP_INJURED
        : GAME_RULES.MEDICINE_HP
    const inventory: GameState['inventory'] = { ...state.inventory }
    const medicineLeft = (inventory.medicine ?? 0) - 1
    if (medicineLeft <= 0) delete inventory.medicine
    else inventory.medicine = medicineLeft
    if (targetId === 'self') {
      const stats = { ...state.stats, hp: clamp(state.stats.hp + healAmount, 0, GAME_RULES.MAX_HP) }
      return { state: { ...state, stats, inventory }, notes: [`의약품을 사용했다. 체력 +${healAmount}.`] }
    }
    const survivors = state.survivors.map((sv) =>
      sv.id === targetId ? { ...sv, hp: clamp(sv.hp + healAmount, 0, 100), infected: false } : sv,
    )
    return { state: { ...state, survivors, inventory }, notes: [`의약품을 사용했다. 체력 +${healAmount}.`] }
  }

  // 붕대는 본인에게만 사용한다.
  const inventory: GameState['inventory'] = { ...state.inventory }
  const bandageLeft = (inventory.bandage ?? 0) - 1
  if (bandageLeft <= 0) delete inventory.bandage
  else inventory.bandage = bandageLeft
  return {
    state: { ...state, inventory, statusEffects: { ...state.statusEffects, injured: false }, injuredUntreatedDays: 0 },
    notes: ['붕대로 부상을 치료했다.'],
  }
}

function resolveCraft(state: GameState, recipeId: string | undefined): { state: GameState; notes: string[] } {
  const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId)
  if (!recipe) return { state, notes: ['만들 수 있는 것이 없다.'] }
  for (const [id, need] of Object.entries(recipe.consumes)) {
    if ((state.inventory[id as ItemId] ?? 0) < (need ?? 0)) return { state, notes: ['재료가 부족하다.'] }
  }
  for (const [id, need] of Object.entries(recipe.keeps ?? {})) {
    if ((state.inventory[id as ItemId] ?? 0) < (need ?? 0)) return { state, notes: ['필요한 도구가 없다.'] }
  }
  if (recipe.id === 'warmMeal' && state.stats.food < 1) return { state, notes: ['재료가 부족하다.'] }

  const inventory = { ...state.inventory }
  for (const [id, need] of Object.entries(recipe.consumes)) {
    const key = id as ItemId
    const next = (inventory[key] ?? 0) - (need ?? 0)
    if (next <= 0) delete inventory[key]
    else inventory[key] = next
  }
  for (const [id, gain] of Object.entries(recipe.produces)) {
    const key = id as ItemId
    inventory[key] = (inventory[key] ?? 0) + (gain ?? 0)
  }
  const stats = recipe.id === 'warmMeal' ? { ...state.stats, food: state.stats.food - 1 } : state.stats
  return { state: { ...state, inventory, stats }, notes: [`${recipe.name}을(를) 완성했다.`] }
}

export function actionAvailability(state: GameState): Record<ActionId, boolean> {
  return {
    rest: true,
    explore: true,
    repair: true,
    scout: true,
    radio: (state.inventory.radio ?? 0) > 0,
    treat: (state.inventory.medicine ?? 0) > 0 || (state.inventory.bandage ?? 0) > 0,
    craft: CRAFT_RECIPES.some(
      (r) =>
        Object.entries(r.consumes).every(([id, need]) => (state.inventory[id as ItemId] ?? 0) >= (need ?? 0)) &&
        Object.entries(r.keeps ?? {}).every(([id, need]) => (state.inventory[id as ItemId] ?? 0) >= (need ?? 0)) &&
        (r.id !== 'warmMeal' || state.stats.food >= 1),
    ),
    guard: true,
  }
}

export function performAction(state: GameState, actionId: ActionId, params: ActionParams = {}): GameState {
  if (state.phase !== 'day' || state.actionTaken || state.activeEventId) return state
  return withRng(state, (rng, s0) => {
    let s = s0
    let notes: string[] = []

    switch (actionId) {
      case 'rest': {
        let hpGain: number = GAME_RULES.REST_HP
        let mentalGain: number = GAME_RULES.REST_MENTAL
        if ((s.inventory.blanket ?? 0) > 0) hpGain += GAME_RULES.REST_BLANKET_HP
        if ((s.inventory.book ?? 0) > 0) mentalGain += GAME_RULES.REST_BOOK_MENTAL
        if ((s.inventory.photo ?? 0) > 0) mentalGain += GAME_RULES.REST_PHOTO_MENTAL
        if (s.statusEffects.injured) hpGain = Math.round(hpGain * GAME_RULES.INJURY_RECOVERY_PENALTY)
        const applied = applyEffects(s, [{ type: 'hp', amount: hpGain }, { type: 'mental', amount: mentalGain }], rng)
        s = applied.state
        notes = [...applied.notes, `휴식으로 체력 +${hpGain}, 정신력 +${mentalGain}.`]
        break
      }
      case 'explore': {
        if (!params.location || state.day < LOCATIONS[params.location].unlockDay) {
          notes = ['아직 열리지 않은 장소다.']
          break
        }
        const result = resolveExplore(s, params.location, rng)
        s = result.state
        notes = result.notes
        break
      }
      case 'repair': {
        const result = resolveRepair(s, rng)
        s = result.state
        notes = result.notes
        break
      }
      case 'scout': {
        const jobBonus = s.survivors.some((sv) => sv.alive && sv.job === 'scout') ? GAME_RULES.SCOUT_JOB_BONUS : 0
        const bonusValue = GAME_RULES.SCOUT_EXPLORE_BONUS + jobBonus
        const applied = applyEffects(s, [{ type: 'mental', amount: -GAME_RULES.SCOUT_MENTAL_COST }], rng)
        s = { ...applied.state, scoutBonusCharges: bonusValue }
        notes = [...applied.notes, '주변을 정찰했다. 다음 탐색이나 이벤트에 도움이 될 것이다.']
        break
      }
      case 'radio': {
        if ((s.inventory.radio ?? 0) <= 0) {
          notes = ['라디오가 없다.']
          break
        }
        const gain = GAME_RULES.RADIO_INFO_MIN + rng.intBelow(GAME_RULES.RADIO_INFO_MAX - GAME_RULES.RADIO_INFO_MIN + 1)
        const applied = applyEffects(s, [{ type: 'power', amount: -GAME_RULES.RADIO_POWER_COST }, { type: 'info', amount: gain }], rng)
        s = applied.state
        notes = [...applied.notes, `라디오를 청취했다. 정보 +${gain}.`]
        break
      }
      case 'treat': {
        const result = resolveTreat(s, params)
        s = result.state
        notes = result.notes
        break
      }
      case 'craft': {
        const result = resolveCraft(s, params.recipeId)
        s = result.state
        notes = result.notes
        break
      }
      case 'guard': {
        const applied = applyEffects(s, [{ type: 'mental', amount: -GAME_RULES.GUARD_MENTAL_COST }], rng)
        s = { ...applied.state, guardActiveTonight: true }
        notes = [...applied.notes, '오늘 밤은 경계를 선다.']
        break
      }
    }

    s = { ...s, actionTaken: true, actionOfDay: actionId }
    s = logNotes(s, notes)
    s = checkDeath(s)
    if (s.phase === 'ended') return s

    if (s.day >= 30) return s // 30일째는 행동 대신 파이널 이벤트로 직행 (endDay에서 이미 세팅됨)

    s = queueEventsForDay(s, rng)
    if (s.activeEventId == null) {
      s = resolveNight(s, rng)
      s = checkDeath(s)
      if (s.phase === 'ended') return s
      return endDay(s)
    }
    return s
  })
}

// ============================== 선택지 해결 ==============================
/** 선택지 효과를 실제로 적용하고, 이벤트/밤/하루 마감까지 이어서 처리한다. */
function finishChoiceResolution(
  state: GameState,
  event: GameEvent,
  ops: EffectOp[],
  resultText: string,
  logPrefix: string,
  rng: Rng,
): GameState {
  const applied = applyEffects(state, ops, rng)
  let working = logNotes(applied.state, applied.notes)
  working = log(working, `${logPrefix} → ${resultText}`, 'event')
  working = { ...working, pendingChoiceResult: resultText }

  if (event.id === DAY30_EVENT.id) {
    working = checkDeath(working)
    if (working.phase === 'ended') return working
    return finalizeGame(working)
  }

  working = checkDeath(working)
  if (working.phase === 'ended') return working

  if (working.queuedEventIds.length > 0) {
    const [next, ...rest] = working.queuedEventIds
    return { ...working, activeEventId: next, queuedEventIds: rest }
  }

  working = { ...working, activeEventId: null }
  working = resolveNight(working, rng)
  working = checkDeath(working)
  if (working.phase === 'ended') return working
  return endDay(working)
}

export function resolveChoice(state: GameState, choiceId: string): GameState {
  if (!state.activeEventId) return state
  return withRng(state, (rng, s0) => {
    const event = getEvent(s0.activeEventId!)
    if (!event) return s0
    const choice = event.choices.find((ch) => ch.id === choiceId)
    if (!choice || !requirementMet(s0, choice.requires)) return s0

    let ops: EffectOp[]
    let resultText: string
    if (choice.chance != null || choice.chanceFn) {
      const chance = clampChance(choice.chanceFn ? choice.chanceFn(s0) : (choice.chance as number))
      const { success } = resolveChance(rng, chance)
      ops = success ? choice.success ?? [] : choice.fail ?? []
      resultText = success ? choice.successText ?? '' : choice.failText ?? ''
    } else {
      ops = choice.effects ?? []
      resultText = choice.resultText ?? ''
    }

    const logPrefix = `[${event.title}] ${choice.label}`
    const aliveCount = s0.survivors.filter((sv) => sv.alive).length
    const needsSurvivorPick = aliveCount >= 2 && ops.some((op) => op.type === 'survivorLeave')
    if (needsSurvivorPick) {
      return { ...s0, pendingLeaveChoice: { ops, resultText, logPrefix } }
    }

    return finishChoiceResolution(s0, event, ops, resultText, logPrefix, rng)
  })
}

/** "누구를 보낼까?" 선택 화면에서 특정 동료를 골랐을 때 호출한다. */
export function resolveSurvivorSend(state: GameState, survivorId: string): GameState {
  if (!state.pendingLeaveChoice || !state.activeEventId) return state
  return withRng(state, (rng, s0) => {
    const pending = s0.pendingLeaveChoice
    const event = getEvent(s0.activeEventId!)
    if (!pending || !event) return s0
    const ops = pending.ops.map((op): EffectOp => (op.type === 'survivorLeave' ? { type: 'survivorLeaveTarget', id: survivorId } : op))
    const cleared = { ...s0, pendingLeaveChoice: null }
    return finishChoiceResolution(cleared, event, ops, pending.resultText, pending.logPrefix, rng)
  })
}
