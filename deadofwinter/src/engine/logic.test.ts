import { describe, it, expect } from 'vitest'
import { generateRoomCode, allReady, advanceTurn, nextFirstPlayerIndex, dealSurvivors } from './logic'
import { SURVIVORS } from './survivors'
import type { PlayerSlot } from './types'
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
