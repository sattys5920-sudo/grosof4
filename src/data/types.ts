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
