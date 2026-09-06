// 아브라카왓 온라인 대전(방/공개 상태) 타입. 순수 게임 로직 타입은
// abracawhat.ts에 있고, 여기는 Firestore 문서 모양만 담당한다.
import type { Difficulty, SpellCounts, SpellId } from './abracawhat'
import type { LogEntry } from './types'

export type AbracaRole = 'host' | 'guest'
export type AbracaPhase = 'lobby' | 'playing' | 'over'

export interface AbracaPlayerPublic {
  name: string
  hp: number
  /** 남은 히든 타일 총 개수 — 물리적으로 자기 앞에 뒤집힌 타일이 몇
   * 장 있는지는 본인도 볼 수 있는 정보라 공개로 둔다. 어떤 마법인지는
   * 여기 안 들어있다. */
  hiddenCount: number
}

export interface AbracaPendingDeclare {
  by: AbracaRole
  spellId: SpellId
}

/** 누가 어떤 마법을 선언해서 성공/실패했는지 — 이미 로그 문장으로도
 * 공개되는 정보라 구조화해서 한 번 더 들고 있어도 새로 새는 정보는
 * 없다. 각자 자기 화면의 "확인된 마법/실패한 추리" 메모를 여기서
 * by===내 역할인 것만 걸러서 만든다(내 손패 문서는 나 자신이 절대
 * 못 읽으므로 이 공개 기록이 유일한 자기 메모 수단이다). */
export interface AbracaDeclareLogEntry {
  by: AbracaRole
  spellId: SpellId
  success: boolean
  at: number
}

export interface AbracaRoomDoc {
  code: string
  createdAt: number
  hostUid: string
  guestUid: string | null
  phase: AbracaPhase
  difficulty: Difficulty
  activeSpellIds: SpellId[]
  currentPlayer: AbracaRole
  host: AbracaPlayerPublic
  guest: AbracaPlayerPublic
  pendingDeclare: AbracaPendingDeclare | null
  declareLog: AbracaDeclareLogEntry[]
  winner: AbracaRole | null
  log: LogEntry[]
}

/** abracaRooms/{code}/private/host, /guest 문서. 이름 그대로 "그
 * 역할의 손패"지만, 보안 규칙상 그 역할 본인은 절대 못 읽고 오직
 * 상대방만 읽고 쓸 수 있다 — "내 마법은 나도 모른다"를 실제로
 * 강제하는 장치. */
export interface AbracaHandDoc {
  remaining: SpellCounts
}
