// 아브라카왓 순수 로직(네트워크·Firestore와 무관). 이 게임의 핵심은
// "내 손패는 나도 못 보고 상대만 본다"라서, 실제 온라인 대전에서는
// 판정을 항상 상대 쪽 클라이언트가 수행한다 — 그 판정에 쓰는 로직만
// 여기 순수 함수로 뽑아 둔다. Firestore 읽기/쓰기·방 개념은 room.ts가
// 맡는다.
import { shuffle } from './logic'

export type SpellId = 'fire' | 'wind' | 'water' | 'lightning' | 'light' | 'shadow' | 'heal' | 'ice' | 'earth' | 'illusion'

export interface SpellDef {
  id: SpellId
  name: string
  icon: string
}

export const ALL_SPELLS: SpellDef[] = [
  { id: 'fire', name: '불꽃', icon: '🔥' },
  { id: 'wind', name: '바람', icon: '🌪️' },
  { id: 'water', name: '물', icon: '💧' },
  { id: 'lightning', name: '번개', icon: '⚡' },
  { id: 'light', name: '빛', icon: '✨' },
  { id: 'shadow', name: '그림자', icon: '🌑' },
  { id: 'heal', name: '치유', icon: '💚' },
  { id: 'ice', name: '얼음', icon: '❄️' },
  { id: 'earth', name: '대지', icon: '🪨' },
  { id: 'illusion', name: '환영', icon: '🎭' },
]

export const SPELL_MAP: Record<SpellId, SpellDef> = ALL_SPELLS.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<SpellId, SpellDef>,
)

export type Difficulty = 'easy' | 'normal' | 'hard'

export interface DifficultyConfig {
  spellTypeCount: number
  tilesPerPlayer: number
  startingHp: number
}

/** 난이도는 "마법 종류 수·중복 개수"로 조절한다(스펙에 구체 수치가
 * 없어 직접 정함) — 쉬움은 종류가 적어 기억하기 쉽고 체력이 넉넉하고,
 * 어려움은 종류가 많고 체력이 빠듯하다. */
export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { spellTypeCount: 5, tilesPerPlayer: 6, startingHp: 6 },
  normal: { spellTypeCount: 7, tilesPerPlayer: 8, startingHp: 5 },
  hard: { spellTypeCount: 10, tilesPerPlayer: 10, startingHp: 4 },
}

export type SpellCounts = Partial<Record<SpellId, number>>

/** 이번 판에 실제로 쓰일 마법 종류 풀을 무작위로 뽑는다(공개 정보 —
 * 어떤 종류가 있는지는 둘 다 알아도 되고, "누가 뭘 가졌는지"만 비밀). */
export function pickActiveSpells(count: number, rng: () => number = Math.random): SpellId[] {
  return shuffle(
    ALL_SPELLS.map((s) => s.id),
    rng,
  ).slice(0, count)
}

/** 한 사람의 손패(마법별 보유 개수)를 무작위로 굴린다 — 물리적으로
 * 각자 자기 몫의 타일 통에서 뽑는 느낌이라, 두 사람이 공유 더미를
 * 나눠 갖는 게 아니라 각자 독립적으로 뽑는다. */
export function rollHandCounts(activeSpellIds: SpellId[], tileCount: number, rng: () => number = Math.random): SpellCounts {
  const counts: SpellCounts = {}
  for (let i = 0; i < tileCount; i++) {
    const pick = activeSpellIds[Math.floor(rng() * activeSpellIds.length)]
    counts[pick] = (counts[pick] ?? 0) + 1
  }
  return counts
}

export interface DeclareOutcome {
  success: boolean
  nextRemaining: SpellCounts
}

/** 선언 하나를 판정한다(순수 함수) — 실제로 남아있으면 성공(그 개수를
 * 하나 소모), 없으면 실패. 체력 반영·로그·Firestore 쓰기는 호출부
 * (room.ts의 resolvePendingDeclare, 상대 쪽 클라이언트에서 실행)가
 * 한다 — 선언한 사람 본인은 이 판정에 필요한 remaining 값 자체를 절대
 * 읽을 수 없기 때문이다. */
export function resolveDeclare(remaining: SpellCounts, spellId: SpellId): DeclareOutcome {
  const success = (remaining[spellId] ?? 0) > 0
  if (!success) return { success: false, nextRemaining: remaining }
  return { success: true, nextRemaining: { ...remaining, [spellId]: (remaining[spellId] ?? 0) - 1 } }
}
