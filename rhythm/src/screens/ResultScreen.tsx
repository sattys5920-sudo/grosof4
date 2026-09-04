import { useMemo } from 'react'
import type { Difficulty, PlayResult } from '../engine/types'
import type { RankInfo } from '../engine/ranking'
import Mascot, { type MascotMood } from '../components/Mascot'

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '쉬움', normal: '보통', hard: '어려움' }

function gradeFor(accuracy: number): { label: string; mood: MascotMood } {
  if (accuracy >= 95) return { label: 'S', mood: 'excited' }
  if (accuracy >= 85) return { label: 'A', mood: 'excited' }
  if (accuracy >= 70) return { label: 'B', mood: 'happy' }
  if (accuracy >= 50) return { label: 'C', mood: 'idle' }
  return { label: 'D', mood: 'sad' }
}

export default function ResultScreen({
  result,
  isNewBest,
  rankInfo,
  rankLoading,
  songName,
  nickname,
  difficulty,
  onRetry,
  onNewSong,
}: {
  result: PlayResult
  isNewBest: boolean
  rankInfo: RankInfo | null
  rankLoading: boolean
  songName: string
  nickname: string
  difficulty: Difficulty
  onRetry: () => void
  onNewSong: () => void
}) {
  const grade = useMemo(() => gradeFor(result.accuracy), [result.accuracy])

  return (
    <div className="result-screen">
      <div className="result-card">
        <Mascot mood={grade.mood} bump={1} />
        <div className="result-grade">{grade.label}</div>
        {isNewBest && <div className="result-newbest">신기록!</div>}
        {rankLoading && <div className="result-rank">순위 확인 중…</div>}
        {!rankLoading && rankInfo && (
          <div className="result-rank">
            이 곡 · {DIFFICULTY_LABEL[difficulty]} 랭킹 {rankInfo.total}명 중 <strong>{rankInfo.rank}위</strong>
          </div>
        )}
        <div className="result-song">
          {nickname} · {songName} · {DIFFICULTY_LABEL[difficulty]}
        </div>
        <div className="result-score">{result.score.toLocaleString()}점</div>

        <div className="result-stats">
          <div className="result-stat">
            <span className="result-stat-label">최대 콤보</span>
            <span className="result-stat-value">{result.maxCombo}</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-label">정확도</span>
            <span className="result-stat-value">{result.accuracy.toFixed(1)}%</span>
          </div>
        </div>

        <div className="result-breakdown">
          <span className="judgment-tag judgment-perfect">PERFECT {result.counts.perfect}</span>
          <span className="judgment-tag judgment-great">GREAT {result.counts.great}</span>
          <span className="judgment-tag judgment-good">GOOD {result.counts.good}</span>
          <span className="judgment-tag judgment-miss">MISS {result.counts.miss}</span>
        </div>

        <div className="result-actions">
          <button type="button" className="result-btn primary" onClick={onRetry}>
            다시 하기
          </button>
          <button type="button" className="result-btn" onClick={onNewSong}>
            다른 곡 고르기
          </button>
        </div>
      </div>
    </div>
  )
}
