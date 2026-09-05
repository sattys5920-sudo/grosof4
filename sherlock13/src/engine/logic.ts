// Firestore/네트워크와 무관한 순수 로직. 셔플·분배·특징 세기·용의자
// 추리처럼 값만 받아 값만 돌려주는 함수만 모아서 vitest로 바로 검증한다.
import type { Suspect, SuspectId, TraitId } from './types'

/** 피셔-예이츠 셔플. rng를 주입할 수 있어 테스트에서 결정적으로 검증한다. */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface Deal {
  hostHand: SuspectId[]
  guestHand: SuspectId[]
  leftId: SuspectId
  criminalId: SuspectId
  rightId: SuspectId
}

/** 13명을 섞어서 호스트 5장, 게스트 5장, 중앙 왼쪽/범인/오른쪽 1장씩으로
 * 나눈다. 13장이 아니면 던진다 — 호출부(룸 생성)에서 항상 13명을 넘겨야
 * 한다. */
export function dealGame(suspects: Suspect[], rng: () => number = Math.random): Deal {
  if (suspects.length !== 13) throw new Error('용의자는 13명이어야 합니다.')
  const shuffled = shuffle(suspects, rng).map((s) => s.id)
  return {
    hostHand: shuffled.slice(0, 5),
    guestHand: shuffled.slice(5, 10),
    leftId: shuffled[10],
    criminalId: shuffled[11],
    rightId: shuffled[12],
  }
}

/** 이 손패 안에서 특정 특징을 가진 용의자가 몇 명인지 센다. */
export function countTrait(hand: SuspectId[], suspectMap: Record<string, Suspect>, trait: TraitId): number {
  let n = 0
  for (const id of hand) {
    const s = suspectMap[id]
    if (s && s.traits.includes(trait)) n++
  }
  return n
}

/** "내 카드"와 "중앙에 공개된 카드"는 자동으로 무죄 처리해서, 남은 범인
 * 후보만 골라낸다 — 정답을 직접 알려주지 않고 범위만 좁혀 준다. */
export function possibleCriminals(
  allSuspects: Suspect[],
  myHand: SuspectId[],
  revealedCentralIds: SuspectId[],
  manuallyCleared: SuspectId[] = [],
): Suspect[] {
  const safe = new Set<SuspectId>([...myHand, ...revealedCentralIds, ...manuallyCleared])
  return allSuspects.filter((s) => !safe.has(s.id))
}

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 헷갈리는 0/O, 1/I 제외

/** 초대 코드를 만든다. 기본 4자리 — 대문자/숫자만 써서 손으로 불러줘도
 * 헷갈리지 않게 한다. */
export function generateRoomCode(rng: () => number = Math.random, length = 4): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_CHARS[Math.floor(rng() * ROOM_CODE_CHARS.length)]
  }
  return code
}
