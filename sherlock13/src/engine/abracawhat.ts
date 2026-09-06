// 아브라카왓(로컬 2인 핫시트 대전) 순수 로직. 네트워크·Firebase와 전혀
// 무관하다 — 한 기기를 두 사람이 번갈아 보는 게임이라 "숨기기"는 보안
// 규칙이 아니라 화면에 아예 안 그리는 것(+턴 전환 화면)으로 해결한다.
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

/** 난이도는 요청대로 "마법 종류 수·중복 개수"로 조절한다. 구체적인
 * 숫자는 스펙에 없어서 직접 정했다: 쉬움은 종류가 적어 기억하기 쉽고
 * 체력이 넉넉하고, 어려움은 종류가 많고 체력이 빠듯하다. */
export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { spellTypeCount: 5, tilesPerPlayer: 6, startingHp: 6 },
  normal: { spellTypeCount: 7, tilesPerPlayer: 8, startingHp: 5 },
  hard: { spellTypeCount: 10, tilesPerPlayer: 10, startingHp: 4 },
}

export type SpellCounts = Partial<Record<SpellId, number>>

export interface PlayerState {
  name: string
  hp: number
  /** 시작 보유량(고정, 기록용). */
  counts: SpellCounts
  /** 아직 성공으로 안 써버린 남은 개수 — 실제 판정에 쓰는 값. */
  remaining: SpellCounts
  /** 내가 직접 선언해서 "있다"고 확인한 마법(자기 자신만 보는 메모). */
  knownMine: SpellId[]
  /** 내가 선언했다가 "없다"고 확인한 마법(자기 자신만 보는 메모). */
  failedMine: SpellId[]
}

export type AbracaPhase = 'playing' | 'handoff' | 'result'

export interface AbracaState {
  difficulty: Difficulty
  activeSpellIds: SpellId[]
  players: [PlayerState, PlayerState]
  currentPlayerIndex: 0 | 1
  phase: AbracaPhase
  /** phase가 'handoff'일 때만 값이 있다 — 넘겨줄 다음 차례. */
  pendingTurnIndex: 0 | 1 | null
  log: string[]
  winnerIndex: 0 | 1 | null
}

function rollHand(activeSpellIds: SpellId[], tileCount: number, rng: () => number): SpellCounts {
  const counts: SpellCounts = {}
  for (let i = 0; i < tileCount; i++) {
    const pick = activeSpellIds[Math.floor(rng() * activeSpellIds.length)]
    counts[pick] = (counts[pick] ?? 0) + 1
  }
  return counts
}

function makePlayer(name: string, fallbackName: string, activeSpellIds: SpellId[], cfg: DifficultyConfig, rng: () => number): PlayerState {
  const counts = rollHand(activeSpellIds, cfg.tilesPerPlayer, rng)
  return {
    name: name.trim() || fallbackName,
    hp: cfg.startingHp,
    counts,
    remaining: { ...counts },
    knownMine: [],
    failedMine: [],
  }
}

/** 새 판을 만든다. 마법 종류 풀은 매판 무작위로 뽑고(난이도별 개수만큼),
 * 두 플레이어의 보유량도 각자 독립적으로 무작위 배분한다(공유 더미가
 * 아니라 각자 자기 몫을 뽑는 방식 — 물리적 타일 통을 나눠 갖는 느낌). */
export function createAbracaGame(p1Name: string, p2Name: string, difficulty: Difficulty, rng: () => number = Math.random): AbracaState {
  const cfg = DIFFICULTY_CONFIG[difficulty]
  const activeSpellIds = shuffle(
    ALL_SPELLS.map((s) => s.id),
    rng,
  ).slice(0, cfg.spellTypeCount)

  const p1 = makePlayer(p1Name, 'PLAYER 1', activeSpellIds, cfg, rng)
  const p2 = makePlayer(p2Name, 'PLAYER 2', activeSpellIds, cfg, rng)

  return {
    difficulty,
    activeSpellIds,
    players: [p1, p2],
    currentPlayerIndex: 0,
    phase: 'playing',
    pendingTurnIndex: null,
    log: [`게임이 시작되었습니다. ${p1.name}부터 시작합니다.`],
    winnerIndex: null,
  }
}

/** 지금 차례인 사람이 특정 마법을 선언한다. 실제로 그 마법이 남아있으면
 * 성공(상대 체력 -1, 그 개수를 하나 소모), 없으면 실패(자기 체력 -1).
 * 성공이든 실패든 선언 한 번으로 턴이 끝난다(스펙의 턴 흐름도 그대로).
 * 어느 한쪽 체력이 0 이하가 되면 그 자리에서 결과 화면으로 넘어간다. */
export function declareSpell(state: AbracaState, spellId: SpellId): AbracaState {
  if (state.phase !== 'playing') throw new Error('지금은 마법을 선언할 수 없어요.')

  const meIdx = state.currentPlayerIndex
  const oppIdx: 0 | 1 = meIdx === 0 ? 1 : 0
  const me = state.players[meIdx]
  const opp = state.players[oppIdx]
  const spellName = SPELL_MAP[spellId].name
  const success = (me.remaining[spellId] ?? 0) > 0

  let nextMe: PlayerState
  let nextOpp: PlayerState
  let logLine: string

  if (success) {
    nextMe = {
      ...me,
      remaining: { ...me.remaining, [spellId]: (me.remaining[spellId] ?? 0) - 1 },
      knownMine: me.knownMine.includes(spellId) ? me.knownMine : [...me.knownMine, spellId],
    }
    nextOpp = { ...opp, hp: opp.hp - 1 }
    logLine = `${me.name}이(가) "${spellName}"을(를) 선언했습니다 → 성공! ${opp.name}의 체력이 1 감소했습니다.`
  } else {
    nextMe = {
      ...me,
      hp: me.hp - 1,
      failedMine: me.failedMine.includes(spellId) ? me.failedMine : [...me.failedMine, spellId],
    }
    nextOpp = opp
    logLine = `${me.name}이(가) "${spellName}"을(를) 선언했습니다 → 실패! ${me.name}의 체력이 1 감소했습니다.`
  }

  const players: [PlayerState, PlayerState] = meIdx === 0 ? [nextMe, nextOpp] : [nextOpp, nextMe]
  const log = [...state.log, logLine]
  const loserIdx: 0 | 1 | null = players[0].hp <= 0 ? 0 : players[1].hp <= 0 ? 1 : null

  if (loserIdx !== null) {
    const winnerIdx: 0 | 1 = loserIdx === 0 ? 1 : 0
    return {
      ...state,
      players,
      phase: 'result',
      winnerIndex: winnerIdx,
      log: [...log, `${players[loserIdx].name}의 체력이 모두 사라졌습니다. ${players[winnerIdx].name} 승리!`],
    }
  }

  return { ...state, players, phase: 'handoff', pendingTurnIndex: oppIdx, log }
}

/** 턴 전환 화면에서 "PLAYER N 시작"을 눌렀을 때 — 실제로 다음 사람
 * 차례로 넘어간다. */
export function confirmHandoff(state: AbracaState): AbracaState {
  if (state.phase !== 'handoff' || state.pendingTurnIndex === null) return state
  return { ...state, phase: 'playing', currentPlayerIndex: state.pendingTurnIndex, pendingTurnIndex: null }
}
