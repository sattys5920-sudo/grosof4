export type Team = 'ward' | 'sin' | 'veil'

export type Role =
  | '기록자'
  | '감찰자'
  | '보호자'
  | '목격자'
  | '일반학생'
  | '괴이의 사도'
  | '파괴자'
  | '잠입자'
  | '망각자'
  | '복수자'

export type RoomId =
  | 'library'
  | 'infirmary'
  | 'broadcast'
  | 'rooftop'
  | 'classroomA'
  | 'classroomB'
  | 'classroomC'
  | 'classroomD'

export type CardRoomId = 'classroomA' | 'classroomB'

export type HalliRoomId = 'classroomC' | 'classroomD'

export interface Character {
  id: string
  name: string
  team: Team
  role: Role
  avatarSeed: string
  revealText: string
  abilityName: string
  abilityDescription: string
  perceivedYear: number
  storyDay1: string
  storyDay2: string
  storyDay3: string
  storyDay4: string
}

export type EndingKey = 'ward-broken' | 'ward-unbroken' | 'sin-broken' | 'sin-unbroken'

export interface Room {
  id: RoomId
  name: string
  capacity: number
  description: string
  ambientText: string
}

export interface ChatMessage {
  id: string
  authorId: string
  text: string
  time: string
  emphasize?: boolean
}

export interface GroupEventSpec {
  title: string
  description: string
  reward: string
  kind?: 'duel' | 'puzzle' | 'combat'
  category?: string
  puzzleText?: string
  answer?: string
  icon?: string | null
  creatureId?: string
  diagram?: string | null
}

export type CreatureDifficulty = 'easy' | 'medium' | 'hard'

export interface Creature {
  id: string
  name: string
  category: string
  difficulty: CreatureDifficulty
  intro: string
  hp: number
  atk: number
  def: number
  coinReward: number
  icon?: string
  art: { pixels: string[]; palette: Record<string, string> }
}

export type ShopItemKind = 'weapon' | 'armor' | 'food' | 'medicine' | 'tool'

export interface ShopItem {
  id: string
  name: string
  kind: ShopItemKind
  amount: number
  price: number
  icon?: string
  art: { pixels: string[]; palette: Record<string, string> }
}

// 검색기(도구) 아이템으로 보낸 질문 1건. 답은 불가가 직접 입력해서 보낸다 —
// 자동 응답이 아니라, 이 세계(이세계) 데이터베이스 기준으로 불가가 판단해 답한다.
export interface SearchQuery {
  id: string
  query: string
  answer: string | null
  askedAtMs: number
  answeredAtMs: number | null
}

// 불가가 특정 인물에게만 띄우는 개인 서사 팝업(예: 진영 전향 각성 연출). 전체
// 공지(Broadcast)와 달리 그 사람 화면에만 뜬다.
export interface PersonalPopup {
  title: string
  body: string
}

export interface CombatLogEntry {
  id: string
  text: string
}

export interface CombatState {
  creatureId: string
  creatureHp: number
  log: CombatLogEntry[]
  defeated: boolean
  defeatedAtMs: number | null
  turnPlayerId: string | null
  defenderId: string | null
}

export type ClassroomStatus = 'locked' | 'active' | 'cleared'

export interface ClassroomState {
  status: ClassroomStatus
  event: GroupEventSpec | null
  hint: string | null
  note: string | null
  attemptsUsed: number
}

export interface RoomEventState {
  event: GroupEventSpec | null
  cleared: boolean
  clue: string | null
  note: string | null
  combat: CombatState | null
  open: boolean
  investigation: HallwayInvestigationState
}

// 구관 각 방(도서관/보건실/방송실/옥상)에 고정된, 최초 조사 시 재생되는 튜토리얼성
// 서사 이벤트. 로그를 순서대로 재생하다가 마지막에 종이가 떨어지며 그 방에 얽힌
// 두 역할의 이름과 능력을 공개한다. 괴이 발동(전투)과는 별개의, 병행 가능한 트랙이다.
export interface HallwayInvestigation {
  roomId: RoomId
  creatureName: string
  creatureIntro: string
  logs: string[]
  revealRoles: [Role, Role]
}

export interface HallwayInvestigationState {
  started: boolean
  logIndex: number
  completed: boolean
}

export interface FeedComment {
  id: string
  authorId: string
  text: string
  secret: boolean
}

export interface FeedPost {
  id: string
  authorLabel: string
  tag: string
  title: string
  body: string
  imageDataUrl?: string
  time: string
  hearts: number
  heartedByViewer: boolean
  commentsEnabled: boolean
  comments: FeedComment[]
}

export type BroadcastKind = 'event' | 'sin' | 'notice'

export interface Broadcast {
  id: string
  kind: BroadcastKind
  title: string
  body: string
  imageDataUrl?: string
  variant?: string
  footer?: string
}

export type EventCategory = '대결' | '공포연출'

export interface EventLibraryItem {
  id: string
  category: EventCategory
  dispatchKind: 'duel' | 'popup'
  title: string
  description: string
  reward?: string
  popupKind?: BroadcastKind
  popupBody?: string
  implemented: boolean
}

export interface ClassroomPuzzle {
  id: string
  category: string
  title: string
  brief: string
  puzzleText: string
  answer: string
  hint: string
  icon?: string
  diagram?: string
}

export interface HallPuzzle {
  id: string
  title: string
  category: string
  questionText: string
  answer: string
  solution: string
}

export type HallObjectKind = 'hazard' | 'puzzle' | 'item' | 'minigame'

export type HallMinigameKind = 'oddeven' | 'poker' | 'robo77' | 'numberbaseball' | 'davinci'

export interface HallObject {
  id: string
  label: string
  kind: HallObjectKind
  hazardText?: string
  hpDamage?: number
  staminaDamage?: number
  puzzleId?: string
  itemShopId?: string
  itemCoins?: number
  minigameRule?: string
  minigameWinCoins?: number
  minigameKind?: HallMinigameKind
}

export interface HallLogChoice {
  id: string
  label: string
  resultText: string
}

export interface HallLogEntry {
  text: string
  choices?: HallLogChoice[]
}

export interface HallEvent {
  id: string
  roomName: string
  creatureName: string
  creatureIntro: string
  logs: HallLogEntry[]
  objects: HallObject[]
  finalClue: string
  finalClueEmphasis?: boolean
}

export type HallObjectStatus = 'idle' | 'opened' | 'left'

export interface BaseballGameState {
  kind: 'numberbaseball'
  actorId: string
  outcome: 'pending' | 'win' | 'lose'
  secret: string
  guesses: { guess: string; strikes: number; balls: number }[]
  attemptsLeft: number
}

export interface DavinciGameState {
  kind: 'davinci'
  actorId: string
  outcome: 'pending' | 'win' | 'lose'
  tiles: number[]
  revealed: boolean[]
  attemptsLeft: number
  attempts: { position: number; guess: number; result: 'hit' | 'high' | 'low' }[]
}

export type HallGameState = BaseballGameState | DavinciGameState

export interface HallObjectResult {
  status: HallObjectStatus
  actorId: string | null
  puzzleSolved: boolean
  puzzleAttempts: number
  minigamePending: string[]
  minigameChoices: Record<string, string>
  minigameParticipants: Record<string, boolean>
  minigameLog: string[]
  game?: HallGameState
}

export interface HallEventState {
  eventId: string | null
  logIndex: number
  objectIndex: number
  objectResults: Record<string, HallObjectResult>
  startedAtMs: number | null
  completedEventIds: string[]
  logVotes: Record<string, string>
  logResolutions: Record<string, string>
  extraTimeMs: number
}

export type CardPile = 'asc' | 'desc'

export interface CardLogEntry {
  id: string
  kind: 'start' | 'play' | 'endTurn' | 'win' | 'lose'
  actorId?: string
  card?: number
  pile?: CardPile
  deckLeft?: number
  reason?: 'stuck' | 'timeout'
  atMs: number
}

// "더 게임" 협동 카드 게임 상태. 1열은 오름차순(현재 값보다 큰 카드만),
// 100열은 내림차순(현재 값보다 작은 카드만) 낼 수 있다. 덱이 남아 있는 한
// 차례마다 최소 2장을 내야 하고, 덱이 떨어지면 1장만 내도 된다. 차례마다
// 제한 시간(turnStartedAtMs 기준)이 있고, 시간 초과가 누적되면 패배한다.
export interface CardGameState {
  status: 'playing' | 'won' | 'lost'
  hands: Record<string, number[]>
  drawPile: number[]
  pileAsc: number
  pileDesc: number
  turnOrder: string[]
  turnIndex: number
  cardsPlayedThisTurn: number
  turnStartedAtMs: number
  timeoutCount: number
  log: CardLogEntry[]
}

export type HalliColor = 'red' | 'blue' | 'green' | 'yellow'

export interface HalliCard {
  color: HalliColor
  value: number
}

export interface HalliLogEntry {
  id: string
  kind: 'start' | 'flip' | 'win' | 'miss' | 'eliminate' | 'gameover'
  actorId?: string
  card?: HalliCard
  color?: HalliColor
  collected?: number
  atMs: number
}

// 할리갈리 변형 카드 게임. 색깔 4종 × 숫자 1~5(색깔별 장수는 1:5, 2:3, 3:3, 4:2, 5:1)로
// 이뤄진 56장 덱을 참가자에게 고르게 나눈다. 각자 자기 카드는 볼 수 없고 남은 장수만 안다.
// '뒤집기'를 누르면 자기 덱 맨 위 카드가 자기 자리에 공개되고, 다시 누르면 이전 걸 덮어쓴다.
// 지금 공개된 카드들을 색깔별로 더해서 정확히 5가 되는 색이 있으면 '누르기'를 눌러야 하고,
// 가장 먼저 누른 사람이 그 판에 나온 카드(반납된 벌칙 카드 포함)를 전부 자기 덱 맨 뒤로 가져간다.
// 아닌데 눌렀다면 자기 덱 맨 위 카드 한 장을 반납해야 한다(그 판을 이긴 사람에게 돌아간다).
// 덱이 바닥나면 탈락하고, 마지막까지 남은 한 명이 배팅된 코인을 전부 가져간다.
export interface HalliGameState {
  status: 'betting' | 'playing' | 'ended'
  playerIds: string[]
  bets: Record<string, number>
  decks: Record<string, HalliCard[]>
  revealed: Record<string, HalliCard | null>
  roundCards: { playerId: string; card: HalliCard }[]
  penaltyCards: HalliCard[]
  eliminated: string[]
  winnerId: string | null
  pot: number
  log: HalliLogEntry[]
  /** playerIds 배열상에서(=시계 방향 자리 순서) 지금 '뒤집기'를 낼 수 있는 사람의 인덱스. */
  turnIndex: number
}
