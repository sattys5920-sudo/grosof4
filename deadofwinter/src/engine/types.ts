// STEP별로 그때그때 필요한 타입만 추가한다 — 아직 쓰이지 않는 필드를
// 미리 넣어두지 않는다.

export type PlayerSlot = {
  uid: string
  name: string
  ready: boolean
}

export type RoomPhase = 'lobby' | 'playing'

export type LogEntry = {
  at: number
  text: string
}

/** 라운드 안에서의 진행 단계. 'turns' = 선 플레이어부터 한 명씩 턴 진행,
 * 'colony' = 전원 턴이 끝난 뒤 콜로니 단계(STEP 8~9에서 구현). 위기 공개·
 * 주사위 굴리기 단계는 그 기능을 만드는 STEP(5, 9)에서 이 유니언에
 * 끼워 넣는다. */
export type RoundPhase = 'turns' | 'colony'

export interface RoomDoc {
  code: string
  createdAt: number
  hostUid: string
  phase: RoomPhase
  players: PlayerSlot[]

  // phase === 'playing'일 때만 채워진다 (STEP 2에서 startGame이 초기화).
  round?: number
  turnOrder?: string[] // uid 배열, 라운드 내내 고정
  firstPlayerIndex?: number // turnOrder 안에서 이번 라운드 선 플레이어 위치
  currentPlayerIndex?: number // turnOrder 안에서 지금 턴인 플레이어 위치
  roundPhase?: RoundPhase
  log?: LogEntry[]
}

export const MAX_PLAYERS = 4
