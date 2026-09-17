import { describe, it, expect } from 'vitest'
import { createEmptyBoard, findWinLine, countOpenThreeDirections, isForbiddenDoubleThree, canPlace, applyMoves, roleColor } from './board'
import { generateRoomCode } from './logic'
import type { Move } from './types'

describe('applyMoves/canPlace', () => {
  it('빈 판은 전부 null', () => {
    const b = createEmptyBoard()
    expect(b.every((row) => row.every((c) => c === null))).toBe(true)
  })

  it('moves를 순서대로 반영한다', () => {
    const moves: Move[] = [
      { row: 7, col: 7, color: 'black', by: 'host' },
      { row: 7, col: 8, color: 'white', by: 'guest' },
    ]
    const b = applyMoves(moves)
    expect(b[7][7]).toBe('black')
    expect(b[7][8]).toBe('white')
    expect(canPlace(b, 7, 7)).toBe(false)
    expect(canPlace(b, 0, 0)).toBe(true)
    expect(canPlace(b, -1, 0)).toBe(false)
    expect(canPlace(b, 15, 0)).toBe(false)
  })
})

describe('findWinLine', () => {
  it('가로 5개 연속이면 승리', () => {
    const b = createEmptyBoard()
    for (let c = 3; c <= 6; c++) b[7][c] = 'black'
    const line = findWinLine(b, 7, 7, 'black')
    expect(line).not.toBeNull()
    expect(line!.length).toBeGreaterThanOrEqual(5)
  })

  it('세로 5개 연속이면 승리', () => {
    const b = createEmptyBoard()
    for (let r = 3; r <= 6; r++) b[r][7] = 'white'
    const line = findWinLine(b, 7, 7, 'white')
    expect(line).not.toBeNull()
  })

  it('대각선(↘) 5개 연속이면 승리', () => {
    const b = createEmptyBoard()
    for (let i = 3; i <= 6; i++) b[i][i] = 'black'
    const line = findWinLine(b, 7, 7, 'black')
    expect(line).not.toBeNull()
  })

  it('역대각선(↙) 5개 연속이면 승리', () => {
    const b = createEmptyBoard()
    ;[[4, 10], [5, 9], [6, 8], [7, 7], [8, 6]].forEach(([r, c]) => (b[r][c] = 'black'))
    const line = findWinLine(b, 7, 7, 'black')
    expect(line).not.toBeNull()
  })

  it('4개까지는 승리가 아님', () => {
    const b = createEmptyBoard()
    for (let c = 4; c <= 6; c++) b[7][c] = 'black'
    const line = findWinLine(b, 7, 7, 'black')
    expect(line).toBeNull()
  })

  it('6개 이상(장목)도 승리로 인정한다(쌍삼만 구현하는 범위)', () => {
    const b = createEmptyBoard()
    for (let c = 3; c <= 7; c++) b[7][c] = 'black'
    const line = findWinLine(b, 7, 8, 'black')
    expect(line).not.toBeNull()
    expect(line!.length).toBe(6)
  })
})

describe('countOpenThreeDirections', () => {
  it('양끝이 뚫린 곧은 삼은 1로 센다', () => {
    const b = createEmptyBoard()
    b[7][5] = 'black'
    b[7][6] = 'black'
    // (7,7)에 두면 5,6,7이 곧은 삼, 4/8칸이 비어 있어 열려 있음
    expect(countOpenThreeDirections(b, 7, 7, 'black')).toBe(1)
  })

  it('한쪽이 막힌 삼은 세지 않는다', () => {
    const b = createEmptyBoard()
    b[7][5] = 'black'
    b[7][6] = 'black'
    b[7][4] = 'white' // 왼쪽을 막아버림
    expect(countOpenThreeDirections(b, 7, 7, 'black')).toBe(0)
  })

  it('도약삼(끊긴 삼)도 열린 삼으로 센다', () => {
    const b = createEmptyBoard()
    b[7][4] = 'black'
    b[7][6] = 'black'
    // (7,7)에 두면 4,_,6,7 형태 — 5번 칸을 메우면 열린 사가 됨
    expect(countOpenThreeDirections(b, 7, 7, 'black')).toBe(1)
  })

  it('두 방향에서 동시에 열린 삼이 생기면 2', () => {
    const b = createEmptyBoard()
    b[7][5] = 'black'
    b[7][6] = 'black'
    b[5][7] = 'black'
    b[6][7] = 'black'
    expect(countOpenThreeDirections(b, 7, 7, 'black')).toBe(2)
  })
})

describe('isForbiddenDoubleThree', () => {
  it('흑이 쌍삼 자리에 두면 금수', () => {
    const b = createEmptyBoard()
    b[7][5] = 'black'
    b[7][6] = 'black'
    b[5][7] = 'black'
    b[6][7] = 'black'
    expect(isForbiddenDoubleThree(b, 7, 7, 'black')).toBe(true)
  })

  it('백은 같은 모양이어도 쌍삼 규칙이 적용되지 않는다', () => {
    const b = createEmptyBoard()
    b[7][5] = 'white'
    b[7][6] = 'white'
    b[5][7] = 'white'
    b[6][7] = 'white'
    expect(isForbiddenDoubleThree(b, 7, 7, 'white')).toBe(false)
  })

  it('열린 삼이 한 방향뿐이면 금수가 아니다', () => {
    const b = createEmptyBoard()
    b[7][5] = 'black'
    b[7][6] = 'black'
    expect(isForbiddenDoubleThree(b, 7, 7, 'black')).toBe(false)
  })
})

describe('roleColor', () => {
  it('host는 흑, guest는 백', () => {
    expect(roleColor('host')).toBe('black')
    expect(roleColor('guest')).toBe('white')
  })
})

describe('generateRoomCode', () => {
  it('기본 길이는 4', () => {
    expect(generateRoomCode(() => 0).length).toBe(4)
  })

  it('rng=0으로 고정하면 같은 코드', () => {
    expect(generateRoomCode(() => 0)).toBe(generateRoomCode(() => 0))
  })
})
