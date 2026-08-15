import type { HalliCard, HalliColor, HalliRoomId } from './types'

export const HALLI_COLORS: HalliColor[] = ['red', 'blue', 'green', 'yellow']

export const HALLI_COLOR_LABEL: Record<HalliColor, string> = {
  red: '빨강',
  blue: '파랑',
  green: '초록',
  yellow: '노랑',
}

// 색깔별 숫자 구성: 1은 5장, 2·3은 3장씩, 4는 2장, 5는 1장 — 색깔당 14장, 4색 합쳐 56장.
export const HALLI_VALUE_COUNTS: [number, number][] = [
  [1, 5],
  [2, 3],
  [3, 3],
  [4, 2],
  [5, 1],
]

export const HALLI_ROOM_IDS: HalliRoomId[] = ['classroomC', 'classroomD']
export const HALLI_ROOM_CAPACITY = 5
export const HALLI_ROOM_MIN_PLAYERS = 2
export const HALLI_TARGET_SUM = 5

export function buildHalliDeck(): HalliCard[] {
  const deck: HalliCard[] = []
  for (const color of HALLI_COLORS) {
    for (const [value, count] of HALLI_VALUE_COUNTS) {
      for (let i = 0; i < count; i++) deck.push({ color, value })
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

/** 지금 공개돼 있는 카드들을 색깔별로 더해서, 합이 정확히 5가 되는 색을 찾는다. 없으면 null. */
export function findMatchingColor(revealed: (HalliCard | null | undefined)[]): HalliColor | null {
  const sums = new Map<HalliColor, number>()
  for (const card of revealed) {
    if (!card) continue
    sums.set(card.color, (sums.get(card.color) ?? 0) + card.value)
  }
  for (const color of HALLI_COLORS) {
    if (sums.get(color) === HALLI_TARGET_SUM) return color
  }
  return null
}
