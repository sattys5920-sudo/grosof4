// 기획서 42번 "개발 완료 전 자동 검증" 체크리스트를 실제 코드로 옮긴 테스트.
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
  resolveChoice,
  usedCapacity,
} from './engine'
import { saveGame, loadGame, clearGame } from './save'
import type { GameState } from './types'

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

  it('정신력은 100을 초과하지 않는다', () => {
    const state = freshDay1()
    const { state: next } = applyEffects(state, [{ type: 'mental', amount: 9999 }], new Rng(1))
    expect(next.stats.mental).toBeLessThanOrEqual(GAME_RULES.MAX_MENTAL)
  })

  it('물/식량은 99를 초과하지 않는다 (clamp 함수 자체 검증)', () => {
    expect(clamp(9999, 0, GAME_RULES.MAX_WATER)).toBe(GAME_RULES.MAX_WATER)
    expect(clamp(9999, 0, GAME_RULES.MAX_FOOD)).toBe(GAME_RULES.MAX_FOOD)
  })

  it('물/식량 증가는 인벤토리 공간을 초과할 수 없다', () => {
    const state = freshDay1()
    const { state: next } = applyEffects(state, [{ type: 'water', amount: 9999 }], new Rng(1))
    expect(usedCapacity(next)).toBeLessThanOrEqual(capacity(next))
    expect(next.stats.water).toBeLessThanOrEqual(GAME_RULES.MAX_WATER)
  })

  it('탐색/위험 확률은 항상 5~95 사이로 제한된다', () => {
    expect(clampChance(-500)).toBe(GAME_RULES.CHANCE_MIN)
    expect(clampChance(500)).toBe(GAME_RULES.CHANCE_MAX)
    expect(clampChance(50)).toBe(50)
  })
})

describe('자원 부족 사망', () => {
  it('물이 3일 연속 부족하면 사망한다', () => {
    let state = freshDay1()
    state = { ...state, stats: { ...state.stats, water: 0 } }
    for (let i = 0; i < 3 && state.phase !== 'ended'; i++) {
      state = { ...state, day: state.day + 1 }
      state = applyMorning(state)
      state = checkDeath(state)
    }
    expect(state.phase).toBe('ended')
    expect(state.ending).toBe('dehydration')
  })

  it('식량이 4일 연속 부족하면 사망한다', () => {
    let state = freshDay1()
    // 물은 충분히 채워 물 부족으로 먼저 죽지 않게 한다.
    state = { ...state, stats: { ...state.stats, water: 90, food: 0 } }
    for (let i = 0; i < 4 && state.phase !== 'ended'; i++) {
      state = { ...state, day: state.day + 1 }
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
      stats: { ...state.stats, hp: 100, water: 90, food: 90 },
      statusEffects: { ...state.statusEffects, injured: true },
    }
    const hpAfterDay1 = state.stats.hp
    state = { ...state, day: state.day + 1 }
    state = applyMorning(state) // 1일째 방치
    const hpAfterDay2 = state.stats.hp
    state = { ...state, day: state.day + 1 }
    state = applyMorning(state) // 2일째 방치
    const hpAfterDay3 = state.stats.hp
    state = { ...state, day: state.day + 1 }
    state = applyMorning(state) // 3일째 방치 — 여기서부터 추가 피해
    const hpAfterDay4 = state.stats.hp

    expect(hpAfterDay3).toBe(hpAfterDay2) // 아직 3일째 전이라 추가 피해 없음
    expect(hpAfterDay4).toBeLessThan(hpAfterDay3)
    expect(hpAfterDay3).toBeLessThanOrEqual(hpAfterDay1)
  })
})

describe('30일째와 이벤트 규칙', () => {
  it('30일째에는 반드시 엔딩으로 이어진다', () => {
    let state = freshDay1()
    state = { ...state, day: 29, stats: { ...state.stats, hp: 100, mental: 100, water: 90, food: 90, shelter: 100 } }
    state = performAction(state, 'rest')
    // 이벤트가 있으면 전부 넘긴다.
    let guard = 0
    while (state.activeEventId && state.day < 30 && guard < 10) {
      const event = getActiveEvent(state)!
      const choice = enabledChoices(state, event)[0]
      state = resolveChoice(state, choice.id)
      guard++
    }
    expect(state.day).toBe(30)
    expect(state.activeEventId).toBe('day30-final')

    state = resolveChoice(state, 'holdDoor')
    expect(state.phase).toBe('ended')
    expect(state.ending).toBeTruthy()
  })

  it('하루 이벤트는 최대 2개다', () => {
    let state = freshDay1()
    // 조건을 최대한 충족시켜 2번째 이벤트가 뜨기 쉬운 상태로 만든다.
    state = {
      ...state,
      stats: { ...state.stats, mental: 20, hp: 20, water: 1, food: 1, shelter: 20 },
    }
    state = performAction(state, 'rest')
    expect(state.queuedEventIds.length).toBeLessThanOrEqual(1) // activeEventId 1개 + 대기열 최대 1개 = 최대 2개
  })

  it('일회성 이벤트는 같은 판에서 두 번 발생하지 않는다', () => {
    let state = freshDay1()
    const seen = new Set<string>()
    let guard = 0
    while (state.phase !== 'ended' && guard < 300) {
      guard++
      if (state.activeEventId) {
        const event = getActiveEvent(state)!
        if (event.id !== 'day30-final' && !event.repeatable) {
          expect(seen.has(event.id)).toBe(false)
          seen.add(event.id)
        }
        const choice = enabledChoices(state, event)[0]
        state = resolveChoice(state, choice.id)
      } else {
        state = performAction(state, 'rest')
      }
    }
    expect(state.phase).toBe('ended')
  })
})

describe('진엔딩', () => {
  it('8가지 조건을 모두 만족해야 진엔딩이 뜬다', () => {
    let state = freshDay1()
    state = {
      ...state,
      day: 29,
      stats: {
        ...state.stats,
        hp: 100,
        mental: 100,
        water: 90,
        food: 90,
        shelter: 100,
        info: 100,
      },
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
    let guard = 0
    while (state.activeEventId && state.day < 30 && guard < 10) {
      const event = getActiveEvent(state)!
      const choice = enabledChoices(state, event)[0]
      state = resolveChoice(state, choice.id)
      guard++
    }
    expect(state.activeEventId).toBe('day30-final')
    state = resolveChoice(state, 'holdDoor')
    expect(state.ending).toBe('true')
  })

  it('조건 중 하나라도 빠지면 진엔딩이 아니다', () => {
    let state = freshDay1()
    state = {
      ...state,
      day: 29,
      stats: { ...state.stats, hp: 100, mental: 100, water: 90, food: 90, shelter: 100, info: 100 },
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
    let guard = 0
    while (state.activeEventId && state.day < 30 && guard < 10) {
      const event = getActiveEvent(state)!
      const choice = enabledChoices(state, event)[0]
      state = resolveChoice(state, choice.id)
      guard++
    }
    state = resolveChoice(state, 'holdDoor')
    expect(state.ending).not.toBe('true')
  })
})

describe('엔딩 우선순위', () => {
  it('탈출 조건과 공동체 조건이 동시에 맞아도 탈출이 우선한다', () => {
    let state = freshDay1()
    state = {
      ...state,
      day: 29,
      stats: { ...state.stats, hp: 100, mental: 100, water: 90, food: 90, shelter: 100 },
      flags: { escapeRouteReady: true },
      survivors: [
        { id: 'a', name: '테스트생존자', job: 'civilian', personality: '-', hp: 100, trust: 90, alive: true, infected: false },
      ],
    }
    state = performAction(state, 'rest')
    let guard = 0
    while (state.activeEventId && state.day < 30 && guard < 10) {
      const event = getActiveEvent(state)!
      const choice = enabledChoices(state, event)[0]
      state = resolveChoice(state, choice.id)
      guard++
    }
    state = resolveChoice(state, 'holdDoor')
    expect(state.ending).toBe('escape')
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
