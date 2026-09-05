// 셜록 13(2인용) 핵심 타입. engine/은 순수 로직(누가 이겼는지, 특징 개수
// 세기, 남은 용의자 추리)을 담당하고, room.ts가 Firestore 읽기/쓰기와
// 엮어서 실제 대전으로 이어붙인다.

export type SuspectId = string

export type TraitId = 'male' | 'female' | 'hat' | 'glasses' | 'pipe' | 'cane' | 'watch' | 'gloves' | 'necklace'

export interface Trait {
  id: TraitId
  label: string
  icon: string
}

export interface Suspect {
  id: SuspectId
  name: string
  title: string
  traits: TraitId[]
}

export type Role = 'host' | 'guest'

export type GamePhase = 'lobby' | 'playing' | 'over'

export interface CentralPublic {
  /** 공개된 카드만 값이 채워진다. 아직 안 뒤집힌 쪽은 null. */
  leftId: SuspectId | null
  rightId: SuspectId | null
}

export interface Accusation {
  by: Role
  suspectId: SuspectId
  at: number
}

export interface GameResult {
  winner: Role | null
  correct: boolean
  criminalId: SuspectId
}

export interface LastAnswer {
  askedBy: Role
  trait: TraitId
  count: number
  at: number
}

export interface LogEntry {
  at: number
  text: string
}

/** sherlock13Rooms/{code} 문서 — 두 플레이어가 함께 읽는 공개 상태. */
export interface RoomDoc {
  code: string
  createdAt: number
  phase: GamePhase
  hostUid: string | null
  guestUid: string | null
  currentPlayer: Role
  exchangeCount: number
  central: CentralPublic
  accusation: Accusation | null
  result: GameResult | null
  answers: LastAnswer[]
  log: LogEntry[]
}

/** sherlock13Rooms/{code}/private/host, /guest — 본인만 읽는 손패. */
export interface HandDoc {
  hand: SuspectId[]
}

/** sherlock13Rooms/{code}/private/secret — 게임이 끝난 뒤에만 읽힌다. */
export interface SecretDoc {
  criminalId: SuspectId
}

/** sherlock13Rooms/{code}/private/central — 아직 안 뒤집힌 중앙 카드
 * 정체. 자기 차례이고 교환권이 남아 있을 때만 읽힌다. */
export interface CentralSecretDoc {
  leftId: SuspectId
  rightId: SuspectId
}
