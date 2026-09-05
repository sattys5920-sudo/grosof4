import { describe, it, expect } from 'vitest'
import {
  generateRoomCode,
  allReady,
  advanceTurn,
  nextFirstPlayerIndex,
  dealSurvivors,
  rollAllPlayerDice,
  initialDiceUsed,
  consumeAnyDie,
  applySurvivorMove,
  buildItemDeck,
  buildAllItemDecks,
  drawFromDeck,
} from './logic'
import { SURVIVORS } from './survivors'
import { ITEM_TYPES, itemsForLocation } from './items'
import type { PlayerSlot, SurvivorInstance } from './types'
import { MAX_PLAYERS } from './types'

describe('generateRoomCode', () => {
  it('4자리 코드를 만든다', () => {
    const code = generateRoomCode(() => 0.5)
    expect(code).toHaveLength(4)
  })

  it('헷갈리는 0/O/1/I를 쓰지 않는다', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode(Math.random)
      expect(code).not.toMatch(/[01OI]/)
    }
  })

  it('rng가 결정적이면 코드도 결정적이다', () => {
    const a = generateRoomCode(() => 0)
    const b = generateRoomCode(() => 0)
    expect(a).toBe(b)
  })
})

function mkPlayer(uid: string, ready: boolean): PlayerSlot {
  return { uid, name: uid, ready }
}

describe('allReady', () => {
  it('4명 미만이면 false', () => {
    expect(allReady([mkPlayer('a', true), mkPlayer('b', true)], MAX_PLAYERS)).toBe(false)
  })

  it('4명이어도 한 명이라도 준비 안 되면 false', () => {
    const players = [mkPlayer('a', true), mkPlayer('b', true), mkPlayer('c', true), mkPlayer('d', false)]
    expect(allReady(players, MAX_PLAYERS)).toBe(false)
  })

  it('4명 전원 준비되면 true', () => {
    const players = [mkPlayer('a', true), mkPlayer('b', true), mkPlayer('c', true), mkPlayer('d', true)]
    expect(allReady(players, MAX_PLAYERS)).toBe(true)
  })
})

describe('advanceTurn', () => {
  const order = ['a', 'b', 'c', 'd']

  it('마지막 사람이 아니면 다음 인덱스로 넘어가고 라운드는 안 끝난다', () => {
    expect(advanceTurn(order, 0)).toEqual({ nextPlayerIndex: 1, roundOver: false })
    expect(advanceTurn(order, 2)).toEqual({ nextPlayerIndex: 3, roundOver: false })
  })

  it('마지막 사람 턴이 끝나면 라운드가 끝난다', () => {
    expect(advanceTurn(order, 3)).toEqual({ nextPlayerIndex: 3, roundOver: true })
  })
})

describe('nextFirstPlayerIndex', () => {
  const order = ['a', 'b', 'c', 'd']

  it('한 칸씩 돌아간다', () => {
    expect(nextFirstPlayerIndex(order, 0)).toBe(1)
    expect(nextFirstPlayerIndex(order, 3)).toBe(0)
  })
})

describe('dealSurvivors', () => {
  const players = [mkPlayer('a', true), mkPlayer('b', true), mkPlayer('c', true), mkPlayer('d', true)]

  it('4명에게 2명씩, 총 8명을 배분한다', () => {
    const instances = dealSurvivors(players, SURVIVORS)
    expect(instances).toHaveLength(8)
    for (const p of players) {
      expect(instances.filter((s) => s.ownerUid === p.uid)).toHaveLength(2)
    }
  })

  it('같은 생존자가 두 번 배분되지 않는다', () => {
    const instances = dealSurvivors(players, SURVIVORS)
    const ids = instances.map((s) => s.survivorId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('각 플레이어의 첫 번째 생존자만 리더다', () => {
    const instances = dealSurvivors(players, SURVIVORS)
    for (const p of players) {
      const mine = instances.filter((s) => s.ownerUid === p.uid)
      expect(mine.filter((s) => s.isLeader)).toHaveLength(1)
    }
  })

  it('전원 콜로니에서 시작하고 살아있다', () => {
    const instances = dealSurvivors(players, SURVIVORS)
    for (const s of instances) {
      expect(s.locationId).toBe('colony')
      expect(s.alive).toBe(true)
      expect(s.wounds).toBe(0)
    }
  })

  it('풀이 부족하면 던진다', () => {
    expect(() => dealSurvivors(players, SURVIVORS.slice(0, 4))).toThrow()
  })
})

function mkSurvivor(ownerUid: string, alive: boolean): SurvivorInstance {
  return { survivorId: 'sv1', ownerUid, locationId: 'colony', wounds: 0, frostbite: false, alive, isLeader: false }
}

describe('rollAllPlayerDice', () => {
  const players = [mkPlayer('a', true), mkPlayer('b', true)]

  it('살아있는 생존자 수 + 1개를 굴린다', () => {
    const survivors = [mkSurvivor('a', true), mkSurvivor('a', true), mkSurvivor('b', true)]
    const dice = rollAllPlayerDice(players, survivors)
    expect(dice.a).toHaveLength(3)
    expect(dice.b).toHaveLength(2)
  })

  it('죽은 생존자는 세지 않는다', () => {
    const survivors = [mkSurvivor('a', true), mkSurvivor('a', false), mkSurvivor('b', true)]
    const dice = rollAllPlayerDice(players, survivors)
    expect(dice.a).toHaveLength(2)
  })

  it('눈은 항상 1~6이다', () => {
    const survivors = [mkSurvivor('a', true), mkSurvivor('b', true)]
    const dice = rollAllPlayerDice(players, survivors, Math.random)
    for (const values of Object.values(dice)) {
      for (const v of values) {
        expect(v).toBeGreaterThanOrEqual(1)
        expect(v).toBeLessThanOrEqual(6)
      }
    }
  })
})

describe('initialDiceUsed', () => {
  it('주사위 개수와 같은 길이의 false 배열을 만든다', () => {
    const dice = { a: [1, 2, 3], b: [4, 5] }
    expect(initialDiceUsed(dice)).toEqual({ a: [false, false, false], b: [false, false] })
  })
})

describe('consumeAnyDie', () => {
  it('첫 번째 안 쓴 주사위를 쓴 것으로 표시한다', () => {
    const result = consumeAnyDie([false, false, true])
    expect(result).toEqual({ usedIndex: 0, nextDiceUsed: [true, false, true] })
  })

  it('전부 다 썼으면 null이다', () => {
    expect(consumeAnyDie([true, true])).toBeNull()
  })
})

describe('applySurvivorMove', () => {
  const survivors: SurvivorInstance[] = [
    { survivorId: 'sv1', ownerUid: 'a', locationId: 'colony', wounds: 0, frostbite: false, alive: true, isLeader: true },
    { survivorId: 'sv2', ownerUid: 'a', locationId: 'colony', wounds: 0, frostbite: false, alive: false, isLeader: false },
    { survivorId: 'sv3', ownerUid: 'b', locationId: 'colony', wounds: 0, frostbite: false, alive: true, isLeader: true },
  ]

  it('내 생존자를 다른 장소로 옮긴다', () => {
    const next = applySurvivorMove(survivors, 'sv1', 'a', 'hospital')
    expect(next.find((s) => s.survivorId === 'sv1')?.locationId).toBe('hospital')
    // 원본은 안 건드린다
    expect(survivors.find((s) => s.survivorId === 'sv1')?.locationId).toBe('colony')
  })

  it('없는 생존자면 던진다', () => {
    expect(() => applySurvivorMove(survivors, 'nope', 'a', 'hospital')).toThrow()
  })

  it('남의 생존자면 던진다', () => {
    expect(() => applySurvivorMove(survivors, 'sv3', 'a', 'hospital')).toThrow()
  })

  it('죽은 생존자면 던진다', () => {
    expect(() => applySurvivorMove(survivors, 'sv2', 'a', 'hospital')).toThrow()
  })

  it('이미 그 장소면 던진다', () => {
    expect(() => applySurvivorMove(survivors, 'sv1', 'a', 'colony')).toThrow()
  })
})

describe('buildItemDeck / buildAllItemDecks', () => {
  it('한 장소의 카드 수와 더미 길이가 같다', () => {
    const items = itemsForLocation('police')
    const deck = buildItemDeck(items)
    expect(deck).toHaveLength(items.length)
    expect(new Set(deck).size).toBe(items.length)
  })

  it('6개 탐색 장소 전부 더미를 만든다', () => {
    const locations = Array.from(new Set(ITEM_TYPES.map((t) => t.locationId)))
    const decks = buildAllItemDecks(locations, itemsForLocation)
    expect(Object.keys(decks)).toHaveLength(6)
  })
})

describe('drawFromDeck', () => {
  it('맨 앞 카드를 뽑고 나머지를 돌려준다', () => {
    expect(drawFromDeck(['a', 'b', 'c'])).toEqual({ drawn: 'a', remaining: ['b', 'c'] })
  })

  it('빈 더미면 drawn이 null이다', () => {
    expect(drawFromDeck([])).toEqual({ drawn: null, remaining: [] })
  })
})
