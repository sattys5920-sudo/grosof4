// 판정(순수 함수). 초 단위 오차를 등급으로 바꾸고, 콤보에 따라 점수를 매긴다.
// 모든 함수는 GameState 없이 값만 받고 값만 돌려줘서 UI/오디오 클럭과
// 분리해 테스트할 수 있다.
import type { Judgment, JudgmentCounts, NoteState, PlayResult } from './types'

/** 판정 윈도우 (초). 이보다 벗어나면 그 노트에 대한 히트로 인정하지 않는다. */
export const PERFECT_WINDOW = 0.05
export const GREAT_WINDOW = 0.1
export const GOOD_WINDOW = 0.18

const BASE_SCORE: Record<Judgment, number> = { perfect: 300, great: 200, good: 100, miss: 0 }

/** 노트 판정 시각과 실제 입력 시각의 차이(초)로 등급을 매긴다.
 * GOOD_WINDOW를 벗어나면 이 노트에 대한 히트가 아니므로 null. */
export function classifyHit(deltaSeconds: number): Judgment | null {
  const abs = Math.abs(deltaSeconds)
  if (abs <= PERFECT_WINDOW) return 'perfect'
  if (abs <= GREAT_WINDOW) return 'great'
  if (abs <= GOOD_WINDOW) return 'good'
  return null
}

/** 같은 레인에서 아직 판정 안 된 노트 중, hitTime과 가장 가까우면서
 * GOOD_WINDOW 안에 있는 노트를 찾는다. 없으면 null. */
export function findNoteToHit(notes: NoteState[], lane: NoteState['lane'], hitTime: number): NoteState | null {
  let best: NoteState | null = null
  let bestDelta = Infinity
  for (const n of notes) {
    if (n.lane !== lane || n.judgment !== null) continue
    const delta = Math.abs(n.time - hitTime)
    if (delta > GOOD_WINDOW) continue
    if (delta < bestDelta) {
      bestDelta = delta
      best = n
    }
  }
  return best
}

/** 판정선을 GOOD_WINDOW만큼 지나도록 아직 안 맞은 노트는 자동으로 miss
 * 처리한다. (플레이어가 아예 누르지 않은 경우) */
export function autoMissNotes(notes: NoteState[], currentTime: number): NoteState[] {
  let changed = false
  const next = notes.map((n) => {
    if (n.judgment !== null) return n
    if (currentTime - n.time <= GOOD_WINDOW) return n
    changed = true
    return { ...n, judgment: 'miss' as const, judgedAt: currentTime }
  })
  return changed ? next : notes
}

/** 콤보에 따라 점수를 매긴다. 콤보가 높을수록 배율이 붙되 최대 2배로 막는다. */
export function scoreForJudgment(judgment: Judgment, comboBeforeThisNote: number): number {
  const base = BASE_SCORE[judgment]
  if (base === 0) return 0
  const multiplier = 1 + Math.min(comboBeforeThisNote, 50) * 0.02
  return Math.round(base * multiplier)
}

export function summarize(notes: NoteState[]): PlayResult {
  const counts: JudgmentCounts = { perfect: 0, great: 0, good: 0, miss: 0 }
  let score = 0
  let combo = 0
  let maxCombo = 0
  for (const n of notes) {
    const j = n.judgment ?? 'miss'
    counts[j]++
    if (j === 'miss') {
      combo = 0
    } else {
      score += scoreForJudgment(j, combo)
      combo++
      maxCombo = Math.max(maxCombo, combo)
    }
  }
  const totalNotes = notes.length
  const weighted = counts.perfect * 1 + counts.great * 0.7 + counts.good * 0.4
  const accuracy = totalNotes === 0 ? 0 : (weighted / totalNotes) * 100
  return { score, maxCombo, counts, totalNotes, accuracy }
}
