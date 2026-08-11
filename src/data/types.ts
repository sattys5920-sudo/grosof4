export type Team = 'ward' | 'sin' | 'veil'

export type Role = '탐구자' | '방관자' | '거짓유포자' | '배신자' | '경계인'

export type RoomId = 'library' | 'infirmary' | 'broadcast' | 'rooftop'

export interface Character {
  id: string
  name: string
  team: Team
  role: Role
  tagline: string
  incidentPosition: string
  bio: string
  clueHint: string
  avatarSeed: string
}

export interface Room {
  id: RoomId
  name: string
  capacity: number
  description: string
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
  needed: number
  reward: string
}

export type ClassroomStatus = 'locked' | 'active' | 'cleared'

export interface ClassroomState {
  status: ClassroomStatus
  event: GroupEventSpec | null
  participants: string[]
  hint: string | null
  presetIndex: number
}

export interface RoomEventState {
  event: GroupEventSpec | null
  participants: string[]
  cleared: boolean
  clue: string | null
}

export interface FeedComment {
  id: string
  authorId: string
  text: string
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
  comments: FeedComment[]
}

export type BroadcastKind = 'event' | 'sin' | 'notice'

export interface Broadcast {
  id: string
  kind: BroadcastKind
  title: string
  body: string
}
