import type { CardPile, CardRoomId } from './types'

export const CARD_MIN_VALUE = 2
export const CARD_MAX_VALUE = 99
export const HAND_SIZE = 6
export const MIN_PLAY_PER_TURN = 2
export const CARD_ROOM_CAPACITY = 5
export const CARD_ROOM_MIN_PLAYERS = 2
export const CARD_GAME_WIN_COINS = 100
export const CARD_TURN_TIME_LIMIT_MS = 3 * 60 * 1000
export const CARD_TIMEOUT_STRIKES = 3

export const CARD_ROOM_IDS: CardRoomId[] = ['classroomA', 'classroomB']

export function shuffledCardDeck(): number[] {
  const deck: number[] = []
  for (let n = CARD_MIN_VALUE; n <= CARD_MAX_VALUE; n++) deck.push(n)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export function isLegalCardPlay(card: number, pileAsc: number, pileDesc: number, pile: CardPile): boolean {
  return pile === 'asc' ? card > pileAsc : card < pileDesc
}

export function hasAnyLegalCardMove(hand: number[], pileAsc: number, pileDesc: number): boolean {
  return hand.some((c) => c > pileAsc || c < pileDesc)
}
