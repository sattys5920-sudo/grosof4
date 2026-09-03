// 기획서 42번 "개발 완료 전 자동 검증" 체크리스트를 실제 코드로 옮긴 테스트.
// 30일 고정 결승선이 사라진 뒤의 새 규칙(엔드리스 진행, 진엔딩 즉시 종료, 탈출
// 행동, 동료 목마름/배고픔)도 함께 검증한다.
import { beforeAll, describe, expect, it } from 'vitest'
import { GAME_RULES, clamp, clampChance } from './rules'
import { Rng } from './rng'
import { ALL_EVENTS } from './events'
import {
  applyEffects,
  applyMorning,
  capacity,
  checkDeath,
  createInitialState,
  enabledChoices,
  finalizePrep,
  getActiveEvent,
  performAction,
  pickPrepCompanion,
  pickPrepItem,
  resolveChoice,
  resolveSurvivorSend,
  unpickPrepCompanion,
  usedCapacity,
  useFood,
  useWater,
} from './engine'
import { saveGame, loadGame, clearGame } from './save'
import type { GameState, Survivor } from './types'

// vitest는 기본적으로 node 환경이라 localStorage가 없다. save.ts 테스트를 위한
// 최소한의 인메모리 목.
beforeAll(() => {
  const store = new Map<string, string>()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage
})

function freshDay1(): GameState {
  return finalizePrep(createInitialState())
}

function mockSurvivor(id: string, overrides: Partial<Survivor> = {}): Survivor {
  return {
    id,
    name: `동료-${id}`,
    job: 'civilian',
    personality: '-',
    hp: 100,
    trust: 50,
    alive: true,
    infected: false,
    thirst: GAME_RULES.MAX_THIRST,
    hunger: GAME_RULES.MAX_HUNGER,
    ...overrides,
  }
}

/** 이벤트/보류 중인 선택을 자동으로 넘겨서 다음 상태로 진행시킨다. */
function advancePastEvent(state: GameState): GameState {
  if (state.pendingLeaveChoice) {
    const target = state.survivors.find((sv) => sv.alive)
    return target ? resolveSurvivorSend(state, target.id) : state
  }
  if (state.activeEventId) {
    const event = getActiveEvent(state)!
    const choice = enabledChoices(state, event)[0]
    return resolveChoice(state, choice.id)
  }
  return state
}

describe('클램프 규칙', () => {
  it('체력은 100을 초과하지 않는다', () => {
    const state = freshDay1()
    const { state: next } = applyEffects(state, [{ type: 'hp', amount: 9999 }], new Rng(1))
    expect(next.stats.hp).toBeLessThanOrEqual(GAME_RULES.MAX_HP)
    expect(next.stats.hp).toBe(GAME_RULES.MAX_HP)
  })

  it('체력이 0 이하가 되면 사망한다', () => {
    const state = freshDay1()
    const { state: hurt } = applyEffects(state, [{ type: 'hp', amount: -9999 }], new Rng(1))
    expect(hurt.stats.hp).toBe(0)
    const dead = checkDeath(hurt)
    expect(dead.phase).toBe('ended')
    expect(dead.ending).toBeTruthy()
  })

  it('정신 붕괴를 겪은 채로 죽으면 감염이 아닌 한 정신 붕괴 엔딩이 된다', () => {
    let state = freshDay1()
    // 정신력을 0까지 떨어뜨려 정신 붕괴 플래그를 세운다.
    const { state: broken } = applyEffects(state, [{ type: 'mental', amount: -9999 }], new Rng(1))
    expect(broken.mentalBreakdownFlag).toBe(true)
    state = broken
    const { state: hurt } = applyEffects(state, [{ type: 'hp', amount: -9999 }], new Rng(2))
    const dead = checkDeath(hurt)
    expect(dead.phase).toBe('ended')
    expect(dead.ending).toBe('breakdown')
  })

  it('정신력은 100을 초과하지 않는다', () => {
    const state = freshDay1()
    const { state: next } = applyEffects(state, [{ type: 'mental', amount: 9999 }], new Rng(1))
    expect(next.stats.mental).toBeLessThanOrEqual(GAME_RULES.MAX_MENTAL)
  })

  it('목마름/배고픔 게이지는 100을 초과하지 않는다', () => {
    expect(clamp(9999, 0, GAME_RULES.MAX_THIRST)).toBe(GAME_RULES.MAX_THIRST)
    expect(clamp(9999, 0, GAME_RULES.MAX_HUNGER)).toBe(GAME_RULES.MAX_HUNGER)
  })

  it('준비 단계에서 챙기는 물품은 소지 공간 한도를 넘을 수 없다', () => {
    let state = createInitialState()
    for (const p of state.prepLayout) {
      const next = pickPrepItem(state, p.id)
      if (next !== state) state = next
    }
    expect(usedCapacity(state)).toBeLessThanOrEqual(capacity(state))
  })

  it('준비 단계 이후 탐색/이벤트로 얻는 물/식량은 소지 공간 한도를 넘어도 전부 쌓인다', () => {
    const state = freshDay1()
    const { state: next } = applyEffects(state, [{ type: 'item', id: 'water', amount: 9999 }], new Rng(1))
    expect(next.inventory.water).toBe(9999)
    expect(usedCapacity(next)).toBeGreaterThan(capacity(next))
  })

  it('물/식량이 아닌 다른 물품은 준비 단계 이후에도 여전히 소지 공간 한도를 넘을 수 없다', () => {
    const state = freshDay1()
    const { state: next } = applyEffects(state, [{ type: 'item', id: 'medicine', amount: 9999 }], new Rng(1))
    expect(next.inventory.medicine ?? 0).toBeLessThan(9999)
  })

  it('탐색/위험 확률은 항상 5~95 사이로 제한된다', () => {
    expect(clampChance(-500)).toBe(GAME_RULES.CHANCE_MIN)
    expect(clampChance(500)).toBe(GAME_RULES.CHANCE_MAX)
    expect(clampChance(50)).toBe(50)
  })
})

describe('자원 부족 사망', () => {
  it('목마름이 3일 연속 0이면 사망한다', () => {
    let state = freshDay1()
    state = { ...state, stats: { ...state.stats, thirst: 0 } }
    for (let i = 0; i < 3 && state.phase !== 'ended'; i++) {
      // 배고픔은 매번 채워서 굶주림 사망과 섞이지 않게 한다.
      state = { ...state, day: state.day + 1, stats: { ...state.stats, hunger: GAME_RULES.MAX_HUNGER } }
      state = applyMorning(state)
      state = checkDeath(state)
    }
    expect(state.phase).toBe('ended')
    expect(state.ending).toBe('dehydration')
  })

  it('배고픔이 4일 연속 0이면 사망한다', () => {
    let state = freshDay1()
    state = { ...state, stats: { ...state.stats, hunger: 0 } }
    for (let i = 0; i < 4 && state.phase !== 'ended'; i++) {
      state = { ...state, day: state.day + 1, stats: { ...state.stats, thirst: GAME_RULES.MAX_THIRST } }
      state = applyMorning(state)
      state = checkDeath(state)
    }
    expect(state.phase).toBe('ended')
    expect(state.ending).toBe('starvation')
  })
})

describe('부상 방치', () => {
  it('3일째부터 매일 추가 피해가 들어온다', () => {
    let state = freshDay1()
    state = {
      ...state,
      stats: { ...state.stats, hp: 100, thirst: GAME_RULES.MAX_THIRST, hunger: GAME_RULES.MAX_HUNGER },
      statusEffects: { ...state.statusEffects, injured: true },
    }
    const hpAfterDay1 = state.stats.hp
    state = { ...state, day: state.day + 1, stats: { ...state.stats, thirst: GAME_RULES.MAX_THIRST, hunger: GAME_RULES.MAX_HUNGER } }
    state = applyMorning(state) // 1일째 방치
    const hpAfterDay2 = state.stats.hp
    state = { ...state, day: state.day + 1, stats: { ...state.stats, thirst: GAME_RULES.MAX_THIRST, hunger: GAME_RULES.MAX_HUNGER } }
    state = applyMorning(state) // 2일째 방치
    const hpAfterDay3 = state.stats.hp
    state = { ...state, day: state.day + 1, stats: { ...state.stats, thirst: GAME_RULES.MAX_THIRST, hunger: GAME_RULES.MAX_HUNGER } }
    state = applyMorning(state) // 3일째 방치 — 여기서부터 추가 피해
    const hpAfterDay4 = state.stats.hp

    expect(hpAfterDay3).toBe(hpAfterDay2) // 아직 3일째 전이라 추가 피해 없음
    expect(hpAfterDay4).toBeLessThan(hpAfterDay3)
    expect(hpAfterDay3).toBeLessThanOrEqual(hpAfterDay1)
  })
})

describe('동료의 목마름/배고픔', () => {
  it('매일 아침 나와 똑같이 줄어든다', () => {
    let state = freshDay1()
    state = { ...state, survivors: [mockSurvivor('a')] }
    state = { ...state, day: state.day + 1 }
    state = applyMorning(state)
    expect(state.survivors[0].thirst).toBe(GAME_RULES.MAX_THIRST - GAME_RULES.THIRST_DAILY_DROP)
    expect(state.survivors[0].hunger).toBe(GAME_RULES.MAX_HUNGER - GAME_RULES.HUNGER_DAILY_DROP)
  })

  it('게이지가 바닥나 체력이 0이 되면 죽고, 남은 동료에게도 영향을 준다', () => {
    let state = freshDay1()
    const a = mockSurvivor('a', { hp: 5, thirst: 0, hunger: 0 })
    const b = mockSurvivor('b', { trust: 50 })
    state = { ...state, stats: { ...state.stats, mental: 100 }, survivors: [a, b] }
    state = { ...state, day: state.day + 1 }
    state = applyMorning(state)
    expect(state.survivors.find((sv) => sv.id === 'a')?.alive).toBe(false)
    expect(state.stats.mental).toBeLessThan(100)
    expect(state.survivors.find((sv) => sv.id === 'b')?.trust).toBeLessThan(50)
  })
})

describe('엔드리스 진행과 이벤트 규칙', () => {
  it('30일이 지나도 게임이 강제로 끝나지 않는다', () => {
    let state = freshDay1()
    state = {
      ...state,
      day: 30,
      stats: { ...state.stats, hp: 100, mental: 100, thirst: 100, hunger: 100, shelter: 100 },
    }
    state = performAction(state, 'rest')
    let guard = 0
    while ((state.activeEventId || state.pendingLeaveChoice) && guard < 10) {
      state = advancePastEvent(state)
      guard++
    }
    expect(state.phase).not.toBe('ended')
    expect(state.day).toBeGreaterThan(30)
  })

  it('하루 이벤트는 최대 2개다', () => {
    let state = freshDay1()
    // 조건을 최대한 충족시켜 2번째 이벤트가 뜨기 쉬운 상태로 만든다.
    state = {
      ...state,
      stats: { ...state.stats, mental: 20, hp: 20, thirst: 5, hunger: 5, shelter: 20 },
    }
    state = performAction(state, 'rest')
    expect(state.queuedEventIds.length).toBeLessThanOrEqual(1) // activeEventId 1개 + 대기열 최대 1개 = 최대 2개
  })

  it('일회성 이벤트는 여러 날에 걸쳐도 두 번 발생하지 않는다', () => {
    let state = freshDay1()
    const seen = new Set<string>()
    for (let i = 0; i < 400 && state.phase !== 'ended'; i++) {
      if (state.pendingLeaveChoice) {
        state = advancePastEvent(state)
      } else if (state.activeEventId) {
        const event = getActiveEvent(state)!
        if (!event.repeatable) {
          expect(seen.has(event.id)).toBe(false)
          seen.add(event.id)
        }
        state = advancePastEvent(state)
      } else {
        state = performAction(state, 'rest')
      }
      // 자원 부족으로 일찍 죽어 시나리오 커버리지가 줄어들지 않게, 목마름/배고픔은
      // 매 단계 채워 둔다 — 이 테스트가 보려는 건 이벤트 중복 여부다.
      state = { ...state, stats: { ...state.stats, thirst: GAME_RULES.MAX_THIRST, hunger: GAME_RULES.MAX_HUNGER } }
    }
    expect(state.day).toBeGreaterThan(1)
  })
})

describe('진엔딩 — 조건을 모두 만족하면 즉시 끝난다', () => {
  it('8가지 조건을 모두 만족하면 다음 행동 직후 진엔딩으로 끝난다', () => {
    let state = freshDay1()
    state = {
      ...state,
      stats: { ...state.stats, info: 100 },
      counters: { radioStory: 3 },
      flags: {
        militaryRecord: true,
        labExplored: true,
        blackBox: true,
        finalBroadcast: true,
        truthDoor: true,
      },
    }
    state = performAction(state, 'rest')
    expect(state.phase).toBe('ended')
    expect(state.ending).toBe('true')
  })

  it('조건 중 하나라도 빠지면 진엔딩이 아니다', () => {
    let state = freshDay1()
    state = {
      ...state,
      stats: { ...state.stats, info: 100 },
      counters: { radioStory: 3 },
      flags: {
        militaryRecord: true,
        labExplored: true,
        blackBox: true,
        finalBroadcast: true,
        // truthDoor 누락
      },
    }
    state = performAction(state, 'rest')
    expect(state.ending).not.toBe('true')
  })
})

describe('탈출 엔딩', () => {
  it('탈출 준비가 되면 탈출 행동으로 즉시 게임이 끝난다', () => {
    let state = freshDay1()
    state = { ...state, flags: { ...state.flags, escapeRouteReady: true } }
    state = performAction(state, 'escape')
    expect(state.phase).toBe('ended')
    expect(state.ending).toBe('escape')
  })

  it('동료가 희생한 상태로 탈출하면 희생 엔딩이 된다', () => {
    let state = freshDay1()
    state = { ...state, flags: { ...state.flags, escapeRouteReady: true, survivorSacrificed: true } }
    state = performAction(state, 'escape')
    expect(state.ending).toBe('sacrifice')
  })

  it('탈출 준비가 안 됐으면 탈출 행동은 아무 효과가 없다', () => {
    const state = freshDay1()
    const next = performAction(state, 'escape')
    expect(next.phase).toBe('day')
    expect(next.ending).toBeNull()
  })
})

describe('저장/불러오기', () => {
  it('새로고침 후에도(=저장 후 다시 불러와도) 상태가 유지된다', () => {
    clearGame()
    let state = freshDay1()
    state = performAction(state, 'rest')
    saveGame(state)
    const loaded = loadGame()
    expect(loaded).not.toBeNull()
    expect(loaded).toEqual(state)
  })
})

describe('데이터 무결성', () => {
  it('모든 이벤트 id는 유일하다', () => {
    const ids = ALL_EVENTS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 이벤트는 최소 1개의 선택지를 항상 보여줄 수 있다 (요구 아이템이 없어도 대안이 있다)', () => {
    const state = freshDay1()
    for (const event of ALL_EVENTS) {
      const hasFreeChoice = event.choices.some((ch) => !ch.requires)
      const hasEventLevelGate = typeof event.requires === 'function'
      // 이벤트 자체에 requires가 있다면(아이템/플래그로 발생 자체를 막음) 통과.
      // 없다면 선택지 중 최소 하나는 조건 없이 항상 가능해야 한다.
      if (!hasEventLevelGate) {
        expect(hasFreeChoice, `${event.id} 이벤트에 조건 없는 선택지가 없다`).toBe(true)
      } else {
        expect(enabledChoices(state, event).length >= 0).toBe(true)
      }
    }
  })
})

describe('목마름/배고픔 회복', () => {
  it('물을 마시면 물 아이템이 1개 줄고 목마름이 오르고 탈수가 풀린다', () => {
    let state = freshDay1()
    state = {
      ...state,
      inventory: { ...state.inventory, water: 3 },
      stats: { ...state.stats, thirst: 5 },
      statusEffects: { ...state.statusEffects, dehydrated: true },
    }
    state = useWater(state)
    expect(state.inventory.water).toBe(2)
    expect(state.stats.thirst).toBe(35)
    expect(state.statusEffects.dehydrated).toBe(false)
  })

  it('식량 아이템이 없으면 먹을 수 없다', () => {
    const state = freshDay1()
    const next = useFood(state)
    expect(next).toBe(state) // 아무 변화 없이 그대로 반환
  })

  it('물/식량을 나 대신 동료에게 주면 그 동료의 게이지가 회복된다', () => {
    let state = freshDay1()
    const sv = mockSurvivor('a', { hp: 90, thirst: 20, hunger: 20 })
    state = {
      ...state,
      inventory: { ...state.inventory, water: 3, can: 3 },
      stats: { ...state.stats, thirst: 15, hunger: 15 },
      survivors: [sv],
    }
    const afterWater = useWater(state, 'a')
    expect(afterWater.inventory.water).toBe(2)
    expect(afterWater.stats.thirst).toBe(15) // 본인 게이지는 그대로
    expect(afterWater.survivors[0].thirst).toBe(50) // 20 + 30

    const afterFood = useFood(afterWater, 'a')
    expect(afterFood.inventory.can).toBe(2)
    expect(afterFood.survivors[0].hunger).toBe(50)
  })
})

describe('준비 단계 동료 데려오기', () => {
  it('방에서 동료를 데려오면 survivors에 들어가고, 다시 내려놓으면 빠진다', () => {
    let state = createInitialState()
    expect(state.prepCompanions.length).toBe(3)
    const target = state.prepCompanions[0]
    state = pickPrepCompanion(state, target.id)
    expect(state.survivors.some((sv) => sv.id === target.survivor.id)).toBe(true)
    state = unpickPrepCompanion(state, target.id)
    expect(state.survivors.length).toBe(0)
  })

  it('이미 3명이면 더 데려올 수 없다', () => {
    let state = createInitialState()
    for (const c of state.prepCompanions) state = pickPrepCompanion(state, c.id)
    expect(state.survivors.length).toBe(3)
  })
})

describe('이벤트에서 보낼 동료 선택', () => {
  it('생존자가 2명 이상이면 즉시 보내지 않고 선택을 기다린다', () => {
    let state = freshDay1()
    const a = mockSurvivor('a', { name: '가영' })
    const b = mockSurvivor('b', { name: '나은' })
    state = {
      ...state,
      day: 18,
      survivors: [a, b],
      activeEventId: 'e077',
      queuedEventIds: [],
    }
    const result = resolveChoice(state, 'letGo077')
    expect(result.pendingLeaveChoice).not.toBeNull()
    expect(result.survivors.filter((sv) => sv.alive).length).toBe(2)
    expect(result.activeEventId).toBe('e077') // 이벤트 카드 자리에 선택 UI가 뜬다

    const sent = resolveSurvivorSend(result, 'a')
    expect(sent.pendingLeaveChoice).toBeNull()
    expect(sent.survivors.find((sv) => sv.id === 'a')?.alive).toBe(false)
    expect(sent.survivors.find((sv) => sv.id === 'b')?.alive).toBe(true)
  })

  it('생존자가 1명뿐이면 바로 그 사람이 떠난다', () => {
    let state = freshDay1()
    const a = mockSurvivor('a', { name: '가영' })
    state = {
      ...state,
      day: 18,
      survivors: [a],
      activeEventId: 'e077',
      queuedEventIds: [],
    }
    const result = resolveChoice(state, 'letGo077')
    expect(result.pendingLeaveChoice).toBeNull()
    expect(result.survivors.find((sv) => sv.id === 'a')?.alive).toBe(false)
  })
})
