// STEP 1: 방 생성/입장/준비에 필요한 타입만 우선 정의한다. 게임 본편(장소,
// 생존자, 위기, 크로스로드 등)의 데이터 모델은 각 STEP을 구현하면서
// 그때그때 추가한다 — 아직 쓰이지 않는 필드를 미리 넣어두지 않는다.

export type PlayerSlot = {
  uid: string
  name: string
  ready: boolean
}

export type RoomPhase = 'lobby' | 'playing'

export interface RoomDoc {
  code: string
  createdAt: number
  hostUid: string
  phase: RoomPhase
  players: PlayerSlot[]
}

export const MAX_PLAYERS = 4
