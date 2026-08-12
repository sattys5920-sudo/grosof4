export type Team = 'ward' | 'sin' | 'veil'

export type Role =
  | '기록자'
  | '감찰자'
  | '보호자'
  | '목격자'
  | '일반학생'
  | '괴이의 사도'
  | '공범'
  | '잠입자'
  | '망각자'
  | '복수자'

export type RoomId = 'library' | 'infirmary' | 'broadcast' | 'rooftop'

export interface Character {
  id: string
  name: string
  team: Team
  role: Role
  grade: string
  tagline: string
  incidentPosition: string
  bio: string
  clueHint: string
  avatarSeed: string
  revealText: string
  abilityName: string
  abilityDescription: string
  perceivedYear: number
}

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
}

export interface GroupEventSpec {
  title: string
  description: string
  reward: string
  kind?: 'duel' | 'puzzle'
  category?: string
  puzzleText?: string
  answer?: string
  icon?: string
}

export type ClassroomStatus = 'locked' | 'active' | 'cleared'

export interface ClassroomState {
  status: ClassroomStatus
  event: GroupEventSpec | null
  hint: string | null
  note: string | null
}

export interface RoomEventState {
  event: GroupEventSpec | null
  cleared: boolean
  clue: string | null
  note: string | null
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
}

export interface RoomPuzzle {
  id: string
  category: string
  title: string
  brief: string
  puzzleText: string
  answer: string
  hint: string
}
