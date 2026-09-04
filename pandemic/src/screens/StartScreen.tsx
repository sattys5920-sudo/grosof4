import { useState } from 'react'
import type { Difficulty } from '../engine/types'

const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'easy', label: '쉬움', hint: '전염 카드 4장' },
  { id: 'normal', label: '보통', hint: '전염 카드 5장' },
  { id: 'hard', label: '어려움', hint: '전염 카드 6장' },
]

export default function StartScreen({
  hasSave,
  onNewGame,
  onContinue,
}: {
  hasSave: boolean
  onNewGame: (difficulty: Difficulty) => void
  onContinue: () => void
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')

  return (
    <div className="start">
      <div className="start-card">
        <h1 className="start-title">PANDEMIC</h1>
        <p className="start-sub">혼자서 2인 플레이로 즐기는 팬데믹</p>

        {hasSave && (
          <div className="start-resume">
            <p>저장된 게임이 있습니다. 이어서 플레이하시겠습니까?</p>
            <button className="btn btn-primary" onClick={onContinue}>
              저장된 게임 이어하기
            </button>
          </div>
        )}

        <div className="start-difficulty">
          <div className="start-difficulty-label">난이도</div>
          <div className="start-difficulty-options">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                className={`difficulty-btn ${difficulty === d.id ? 'active' : ''}`}
                onClick={() => setDifficulty(d.id)}
              >
                <div className="difficulty-name">{d.label}</div>
                <div className="difficulty-hint">{d.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-large" onClick={() => onNewGame(difficulty)}>
          새 게임
        </button>
      </div>
    </div>
  )
}
