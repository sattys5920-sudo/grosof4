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
  survivors?: SurvivorInstance[] // STEP 4에서 startGame이 2명씩 배분해 채운다.
}

export const MAX_PLAYERS = 4

/** 콜로니(본진) + 6개 외부 장소. STEP 3 범위: 장소 자체와 보드 표시만 —
 * 생존자 배치(STEP 4), 이동(STEP 6), 좀비/입구(STEP 7)는 각 STEP에서
 * 이 데이터에 상태를 얹는다. */
export type LocationId = 'colony' | 'police' | 'grocery' | 'school' | 'gasStation' | 'library' | 'hospital'

export interface Location {
  id: LocationId
  name: string
  icon: string
  description: string
}

/** 생존자 원형(카드) 데이터 — 정적이라 SURVIVORS 풀에 미리 정의해 둔다.
 * 실제 이동·전투·상처 등 상태는 SurvivorInstance가 따로 들고 있는다. */
export type SurvivorId = string

export interface Survivor {
  id: SurvivorId
  name: string
  title: string
  influence: number // 낮을수록 물림 전염 시 먼저 지목된다 (섹션 9)
  attack: number
  ability: string
  icon: string
}

/** 실제 게임에 배분된 생존자 한 명의 상태. STEP 4 범위: 배분과 표시만 —
 * wounds/frostbite/alive는 STEP 7(좀비·노출)에서, locationId 이동은
 * STEP 6에서 값이 바뀌기 시작한다. */
export interface SurvivorInstance {
  survivorId: SurvivorId
  ownerUid: string
  locationId: LocationId
  wounds: number
  frostbite: boolean
  alive: boolean
  isLeader: boolean
}
