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

  // uid → 이번 라운드에 굴린 주사위 눈(1~6) 배열. 개수는 "생존자 수 + 1"
  // (섹션 3). STEP 5 범위: 굴려서 보여주기만 — 실제로 행동에 소모하는
  // 처리(diceUsed를 true로 바꾸는 것)는 STEP 6(이동·공격·탐색)에서 한다.
  dice?: Record<string, number[]>
  diceUsed?: Record<string, boolean[]>

  // 장소별 남은 탐색 카드 더미(장소 id → 아이템 종류 id 배열, 맨 앞이
  // 다음에 뽑힐 카드). 콜로니는 탐색 대상이 아니라 키가 없다. 아이템은
  // 원작과 달리 손패로 숨기지 않고 공개 정보로 단순화했다 — 비밀로
  // 가려야 할 요구사항이 없어서 굳이 보안 규칙을 얹지 않았다.
  itemDecks?: Partial<Record<LocationId, string[]>>
  itemsByPlayer?: Record<string, string[]>

  // 장소별 좀비 수. STEP 7 범위: 매 라운드 콜로니 단계에서 자동으로
  // 늘어나는 처리(섹션 11)는 콜로니 단계 자체를 만드는 STEP 8~9에서
  // 한다 — 여기서는 게임 시작 시 6개 외부 장소에 1마리씩 깔아 둬서
  // 공격·노출 판정을 바로 테스트할 수 있게 했다.
  zombies?: Partial<Record<LocationId, number>>

  // 물림 전염(섹션 9) 진행 중에는 다른 행동을 막고, 지목된 생존자의
  // 주인이 선택해야 한다. null/미정의면 전염 판정이 없는 상태.
  pendingBite?: PendingBite | null
}

export interface PendingBite {
  locationId: LocationId
  targetSurvivorId: SurvivorId
  targetOwnerUid: string
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

/** 노출 주사위 결과(섹션 8). */
export type ExposureFace = 'blank' | 'wound' | 'frostbite' | 'bite'

/** 콜로니를 뺀, 탐색 카드 더미가 있는 6개 장소. */
export type SearchableLocationId = Exclude<LocationId, 'colony'>

/** 탐색으로 얻는 아이템 종류. STEP 6 범위: 데이터와 배분만 — 실제 효과
 * (치료, 위기 기여 등)는 그 시스템을 만드는 STEP에서 하나씩 연결한다. */
export interface ItemType {
  id: string
  name: string
  icon: string
  locationId: SearchableLocationId
}
