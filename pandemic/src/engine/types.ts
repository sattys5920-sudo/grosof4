// 팬데믹 기본판 규칙을 그대로 옮기기 위한 타입 정의.
// 엔진(engine/)은 이 타입만 보고 동작하고, UI(screens/, components/)는
// GameState를 읽기 전용으로만 사용한다.

export type DiseaseColor = 'blue' | 'yellow' | 'black' | 'red'

export const DISEASE_COLORS: DiseaseColor[] = ['blue', 'yellow', 'black', 'red']

export type CityId = string

export interface CityDef {
  id: CityId
  name: string
  color: DiseaseColor
  connections: CityId[]
  /** 지도에 그릴 대략적인 좌표 (0~1000 기준, 실제 위도/경도 기반 개략 배치) */
  x: number
  y: number
}

export type JobId =
  | 'dispatcher' // 운항 관리자
  | 'operationsExpert' // 건축 전문가 / 운영 전문가
  | 'scientist' // 과학자
  | 'medic' // 위생병
  | 'researcher' // 연구원
  | 'quarantineSpecialist' // 검역관
  | 'contingencyPlanner' // 대책 전문가 (실제 기본판 7번째 직업)

export type PlayerCard =
  | { kind: 'city'; city: CityId }
  | { kind: 'epidemic' }
  | { kind: 'event'; event: EventId }

export type EventId = 'airlift' | 'governmentGrant' | 'oneQuietNight' | 'forecast' | 'resilientPopulation'

export interface PlayerState {
  id: 'p1' | 'p2'
  job: JobId
  location: CityId
  hand: PlayerCard[]
  /** 대책 전문가가 버림 더미에서 확보해 둔 이벤트 카드 (게임에서만 제거된다) */
  contingencyCard: EventId | null
}

export type Difficulty = 'easy' | 'normal' | 'hard'

export type ActionId =
  | 'drive'
  | 'directFlight'
  | 'charterFlight'
  | 'shuttleFlight'
  | 'operationsShuttle'
  | 'buildStation'
  | 'treat'
  | 'discoverCure'
  | 'shareKnowledge'
  | 'pass'
  | 'dispatcherMove'
  | 'dispatcherRendezvous'
  | 'contingencyStash'

export interface ActionParams {
  destination?: CityId
  color?: DiseaseColor
  /** 운항 관리자가 대신 움직일 대상 ("자신" 포함 가능) */
  targetPlayer?: 'p1' | 'p2'
  /** dispatcherMove에서 어떤 종류의 이동을 대신 실행할지 */
  moveKind?: 'drive' | 'directFlight' | 'charterFlight' | 'shuttleFlight'
  /** 연구소가 이미 6개일 때 자리를 옮기며 철거할 도시 */
  relocateFrom?: CityId
  /** 대책 전문가가 버림 더미에서 확보할 이벤트 카드 */
  eventFromDiscard?: EventId
}

export interface LogEntry {
  turn: number
  text: string
  tag: 'action' | 'infection' | 'epidemic' | 'system' | 'win' | 'lose'
}

export type GamePhase = 'setup' | 'actions' | 'drawCards' | 'discard' | 'infect' | 'ended'

export interface GameState {
  difficulty: Difficulty
  turn: number
  currentPlayer: 'p1' | 'p2'
  actionsLeft: number
  phase: GamePhase

  players: Record<'p1' | 'p2', PlayerState>

  /** 도시별 질병 큐브 개수 */
  cubes: Record<CityId, Partial<Record<DiseaseColor, number>>>
  /** 남은(공급처) 큐브 개수 */
  cubeSupply: Record<DiseaseColor, number>
  /** 연구소가 있는 도시 목록 */
  stations: CityId[]
  /** 치료제 개발 상태 */
  cured: Record<DiseaseColor, boolean>
  /** 근절 상태 */
  eradicated: Record<DiseaseColor, boolean>

  outbreakCount: number
  /** 감염률 마커 인덱스 (INFECTION_RATE_TRACK의 인덱스) */
  infectionRateIndex: number

  playerDeck: PlayerCard[]
  playerDiscard: PlayerCard[]
  infectionDeck: CityId[]
  infectionDiscard: CityId[]

  /** 손패가 7장을 넘은 플레이어들 - 순서대로 7장이 되도록 버려야 진행된다 */
  pendingDiscards: Array<'p1' | 'p2'>

  /** 건축 전문가(운영 전문가)가 이번 자신의 턴에 "카드 버리고 아무 도시로
   * 이동" 능력을 이미 썼는지 (턴마다 1회) */
  usedOperationsShuttle: Record<'p1' | 'p2', boolean>

  /** 평온한 하룻밤: 다음 도시 감염 단계를 생략 */
  skipNextInfection: boolean

  log: LogEntry[]

  result: 'win' | 'lose' | null
  loseReason: string | null

  /** 저장/불러오기용 시드 (재현성) */
  rngState: number
}
