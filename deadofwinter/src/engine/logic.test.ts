import { describe, it, expect } from 'vitest'
import { generateRoomCode, allReady, advanceTurn, nextFirstPlayerIndex } from './logic'
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
