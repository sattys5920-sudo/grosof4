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

/**
 * playerIds 순서(=시계 방향 자리 순서)를 기준으로, fromIndex부터(그 자리 포함) 한 바퀴 돌며
 * 지금 뒤집을 수 있는 사람(탈락하지 않았고 덱에 카드가 남은 사람)의 인덱스를 찾는다. 덱이
 * 0장이 된 사람은 아직 탈락 처리 전이라도 자기 차례를 건너뛴다. 아무도 없으면(전원 탈락 등
 * 예외 상황) fromIndex를 그대로 돌려준다.
 */
export function settleHalliTurn(
  playerIds: string[],
  eliminated: string[],
  decks: Record<string, HalliCard[]>,
  fromIndex: number,
): number {
  const n = playerIds.length
  for (let step = 0; step < n; step++) {
    const idx = (fromIndex + step) % n
    const id = playerIds[idx]
    if (!eliminated.includes(id) && (decks[id]?.length ?? 0) > 0) return idx
  }
  return fromIndex
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
