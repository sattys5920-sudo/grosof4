// 오목(2인용) 핵심 타입. engine/은 순수 로직(착수 가능 여부, 쌍삼 판정,
// 오목 완성 판정)만 담당하고, room.ts가 Firestore 읽기/쓰기와 엮어서
// 실시간 대전으로 이어붙인다. 손패처럼 숨겨야 할 정보가 없는 게임이라
// 바둑판 전체가 항상 공개 문서 하나에 들어간다.

export type Role = 'host' | 'guest'

export type Stone = 'black' | 'white'

export type GamePhase = 'lobby' | 'playing' | 'over'

export const BOARD_SIZE = 15

export interface Move {
  row: number
  col: number
  color: Stone
  by: Role
}

export interface LogEntry {
  at: number
  text: string
}

export interface GameResult {
  winner: Role
  line: { row: number; col: number }[]
}

/** omokRooms/{code} 문서 — 두 플레이어가 함께 읽고 쓰는 공개 상태.
 * moves를 순서대로 쌓아 두고 바둑판은 그때그때 클라이언트에서
 * 계산한다(applyMoves) — 되돌리기/기보 표시를 굳이 따로 구현할 필요가
 * 없다. */
export interface RoomDoc {
  code: string
  createdAt: number
  phase: GamePhase
  hostUid: string | null
  guestUid: string | null
  hostName: string
  guestName: string
  /** 흑을 잡은 쪽은 항상 호스트 — 오목은 먼저 두는 쪽이 흑이라 방을 만든
   * 사람이 자동으로 흑, 즉 첫 수를 둔다. */
  currentTurn: Role
  moves: Move[]
  result: GameResult | null
  log: LogEntry[]
  /** 지금 차례인 사람이 이 시각(ms)까지 못 두면 시간패. 한 수 둘 때마다
   * 60초로 다시 채워진다. phase가 'playing'이 아니면 null. */
  turnDeadline: number | null
}

export const TURN_SECONDS = 60
