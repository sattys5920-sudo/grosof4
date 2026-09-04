// 낙하형 5키 리듬게임의 핵심 타입.
// engine/은 오디오 분석(analyze.ts)과 판정/점수(judge.ts)를 담당하는 순수
// 로직이고, UI(screens/, components/)는 이 타입들을 읽기 전용으로 쓰거나
// judge.ts의 순수 함수를 호출해서 상태를 갱신한다.

export type Lane = 0 | 1 | 2 | 3 | 4

export type Difficulty = 'easy' | 'normal' | 'hard'

export interface ChartNote {
  /** 이 노트가 판정선에 도달해야 하는 시각 (초, 곡 재생 시작 기준) */
  time: number
  lane: Lane
  /** 롱노트 지속 시간(초). 있으면 이 시간만큼 키를 계속 누르고 있어야
   * 판정이 확정된다 (어려움 난이도 전용). */
  holdDuration?: number
}

export interface Chart {
  notes: ChartNote[]
  /** 곡 길이 (초) */
  duration: number
  difficulty: Difficulty
}

export type Judgment = 'perfect' | 'great' | 'good' | 'miss'

export interface NoteState extends ChartNote {
  id: number
  judgment: Judgment | null
  /** 판정이 난 실제 시각 (초) - 히트 이펙트 타이밍용 */
  judgedAt: number | null
}

export interface JudgmentCounts {
  perfect: number
  great: number
  good: number
  miss: number
}

export interface PlayResult {
  score: number
  maxCombo: number
  counts: JudgmentCounts
  totalNotes: number
  accuracy: number
}
