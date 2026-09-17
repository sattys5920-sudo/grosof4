// Firestore와 무관한 순수 바둑판 로직. moves 배열을 실제 바둑판으로
// 펼치고, 오목(5개 이상 연속) 완성 여부와 "쌍삼"(렌주 룰의 33금수) 여부를
// 판정한다.
//
// 쌍삼만 구현한다: 한 수로 동시에 "열린 삼"(한쪽을 더 두면 양끝이 뚫린
// 열린 사가 되는 3개 연속)을 두 방향 이상 만들면 그 자리엔 둘 수 없다.
// 정식 렌주 룰에는 이 3-3 금수에도 예외 규정(사삼 조합 등)과 쌍사·장목
// 금수가 더 있지만, 이번 요청은 "쌍삼 불가능한 룰"이라 그 범위만
// 다루고 나머지는 넣지 않는다. 렌주 관례대로 이 금수는 흑(선공)에게만
// 적용한다 — 백은 쌍삼을 둬도 된다.
import type { Move, Role, Stone } from './types'
import { BOARD_SIZE } from './types'

export type Cell = Stone | null
export type Board = Cell[][]

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<Cell>(BOARD_SIZE).fill(null))
}

export function applyMoves(moves: Move[]): Board {
  const board = createEmptyBoard()
  for (const m of moves) {
    if (m.row >= 0 && m.row < BOARD_SIZE && m.col >= 0 && m.col < BOARD_SIZE) {
      board[m.row][m.col] = m.color
    }
  }
  return board
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

export function canPlace(board: Board, row: number, col: number): boolean {
  return inBounds(row, col) && board[row][col] === null
}

const DIRECTIONS: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]

/** (row,col)에 이미 color가 놓여 있다고 가정하고, 그 수로 완성된 5개
 * 이상 연속 라인을 찾는다. 못 찾으면 null. */
export function findWinLine(board: Board, row: number, col: number, color: Stone): { row: number; col: number }[] | null {
  for (const [dx, dy] of DIRECTIONS) {
    const line: { row: number; col: number }[] = [{ row, col }]
    for (let step = 1; ; step++) {
      const r = row + dx * step
      const c = col + dy * step
      if (!inBounds(r, c) || board[r][c] !== color) break
      line.push({ row: r, col: c })
    }
    for (let step = 1; ; step++) {
      const r = row - dx * step
      const c = col - dy * step
      if (!inBounds(r, c) || board[r][c] !== color) break
      line.unshift({ row: r, col: c })
    }
    if (line.length >= 5) return line
  }
  return null
}

function cellChar(board: Board, row: number, col: number, color: Stone): string {
  if (!inBounds(row, col)) return '#'
  const cell = board[row][col]
  if (cell === null) return '.'
  return cell === color ? 'B' : 'O'
}

// 한 수를 두면 열린 사(양끝이 막히지 않은 4목)로 바로 이어질 수 있는
// "열린 삼" 형태. 가운데 인덱스(4)가 반드시 이번에 놓은 돌이어야 하므로
// 문자열 매칭 위치가 중심을 포함하는지도 함께 확인한다.
const OPEN_THREE_PATTERNS = ['.BBB.', '.B.BB.', '.BB.B.']

function directionHasOpenThreeThroughCenter(board: Board, row: number, col: number, color: Stone, dx: number, dy: number): boolean {
  const cells: string[] = []
  for (let i = -4; i <= 4; i++) {
    cells.push(cellChar(board, row + dx * i, col + dy * i, color))
  }
  const centerIndex = 4
  for (const pattern of OPEN_THREE_PATTERNS) {
    for (let s = 0; s <= cells.length - pattern.length; s++) {
      if (s > centerIndex || centerIndex >= s + pattern.length) continue
      if (cells.slice(s, s + pattern.length).join('') === pattern) return true
    }
  }
  return false
}

/** (row,col)에 color를 두었을 때 몇 방향에서 "열린 삼"이 동시에 새로
 * 생기는지 센다. 2개 이상이면 쌍삼. */
export function countOpenThreeDirections(board: Board, row: number, col: number, color: Stone): number {
  const hypothetical = board.map((r) => r.slice())
  hypothetical[row][col] = color
  let count = 0
  for (const [dx, dy] of DIRECTIONS) {
    if (directionHasOpenThreeThroughCenter(hypothetical, row, col, color, dx, dy)) count++
  }
  return count
}

/** 렌주 관례대로 흑만 쌍삼 금수 적용. */
export function isForbiddenDoubleThree(board: Board, row: number, col: number, color: Stone): boolean {
  if (color !== 'black') return false
  return countOpenThreeDirections(board, row, col, color) >= 2
}

export function roleColor(role: Role): Stone {
  return role === 'host' ? 'black' : 'white'
}
