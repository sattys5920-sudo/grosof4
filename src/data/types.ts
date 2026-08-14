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

export type RoomId = 'library' | 'infirmary' | 'broadcast' | 'rooftop'

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

export type ShopItemKind = 'weapon' | 'armor' | 'food' | 'medicine'

export interface ShopItem {
  id: string
  name: string
  kind: ShopItemKind
  amount: number
  price: number
  icon?: string
  art: { pixels: string[]; palette: Record<string, string> }
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
