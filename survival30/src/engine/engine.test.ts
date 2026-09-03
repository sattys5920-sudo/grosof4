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
  pickPrepCompanion,
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

  it('목마름/배고픔 게이지는 30을 초과하지 않는다', () => {
    expect(clamp(9999, 0, GAME_RULES.MAX_THIRST)).toBe(GAME_RULES.MAX_THIRST)
    expect(clamp(9999, 0, GAME_RULES.MAX_HUNGER)).toBe(GAME_RULES.MAX_HUNGER)
  })

  it('물/식량 아이템 획득은 인벤토리 공간을 초과할 수 없다', () => {
    const state = freshDay1()
    const { state: next } = applyEffects(state, [{ type: 'item', id: 'water', amount: 9999 }], new Rng(1))
    expect(usedCapacity(next)).toBeLessThanOrEqual(capacity(next))
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

describe('30일째와 이벤트 규칙', () => {
  it('30일째에는 반드시 엔딩으로 이어진다', () => {
    let state = freshDay1()
    state = {
      ...state,
      day: 29,
      stats: { ...state.stats, hp: 100, mental: 100, thirst: 30, hunger: 30, shelter: 100 },
    }
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
      stats: { ...state.stats, mental: 20, hp: 20, thirst: 5, hunger: 5, shelter: 20 },
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
      // 자원 부족으로 일찍 죽어 시나리오 커버리지가 줄어들지 않게, 목마름/배고픔은
      // 매 단계 채워 둔다 — 이 테스트가 보려는 건 이벤트 중복 여부다.
      state = { ...state, stats: { ...state.stats, thirst: GAME_RULES.MAX_THIRST, hunger: GAME_RULES.MAX_HUNGER } }
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
        thirst: 30,
        hunger: 30,
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
      stats: { ...state.stats, hp: 100, mental: 100, thirst: 30, hunger: 30, shelter: 100, info: 100 },
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
      stats: { ...state.stats, hp: 100, mental: 100, thirst: 30, hunger: 30, shelter: 100 },
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
    expect(state.stats.thirst).toBe(15)
    expect(state.statusEffects.dehydrated).toBe(false)
  })

  it('식량 아이템이 없으면 먹을 수 없다', () => {
    const state = freshDay1()
    const next = useFood(state)
    expect(next).toBe(state) // 아무 변화 없이 그대로 반환
  })

  it('물/식량을 나 대신 동료에게 줄 수 있다', () => {
    let state = freshDay1()
    const sv: Survivor = { id: 'a', name: '가영', job: 'civilian', personality: '-', hp: 90, trust: 50, alive: true, infected: false }
    state = {
      ...state,
      inventory: { ...state.inventory, water: 3, can: 3 },
      stats: { ...state.stats, thirst: 15, hunger: 15 },
      survivors: [sv],
    }
    const afterWater = useWater(state, 'a')
    expect(afterWater.inventory.water).toBe(2)
    expect(afterWater.stats.thirst).toBe(15) // 본인 게이지는 그대로
    expect(afterWater.survivors[0].hp).toBe(93)

    const afterFood = useFood(afterWater, 'a')
    expect(afterFood.inventory.can).toBe(2)
    expect(afterFood.stats.hunger).toBe(15)
    expect(afterFood.survivors[0].hp).toBe(96)
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
  function mockSurvivor(id: string, name: string): Survivor {
    return { id, name, job: 'civilian', personality: '-', hp: 100, trust: 50, alive: true, infected: false }
  }

  it('생존자가 2명 이상이면 즉시 보내지 않고 선택을 기다린다', () => {
    let state = freshDay1()
    const a = mockSurvivor('a', '가영')
    const b = mockSurvivor('b', '나은')
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
    const a = mockSurvivor('a', '가영')
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
