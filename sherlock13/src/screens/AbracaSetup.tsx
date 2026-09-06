import { useState } from 'react'
import type { Difficulty } from '../engine/abracawhat'

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' }

export default function AbracaSetup({
  onStart,
  onBack,
}: {
  onStart: (p1Name: string, p2Name: string, difficulty: Difficulty) => void
  onBack: () => void
}) {
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')

  return (
    <div className="abraca-theme abraca-setup">
      <div className="abraca-emblem">🪄</div>
      <h1 className="abraca-title">ABRACA-WHAT?</h1>
      <p className="abraca-tagline">
        마법을 기억하라.
        <br />
        상대보다 먼저 진실을 찾아라.
      </p>

      <div className="abraca-field">
        <label className="abraca-label">PLAYER 1</label>
        <input
          className="abraca-input"
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          placeholder="이름 입력(선택)"
          maxLength={12}
        />
      </div>
      <div className="abraca-field">
        <label className="abraca-label">PLAYER 2</label>
        <input
          className="abraca-input"
          value={p2}
          onChange={(e) => setP2(e.target.value)}
          placeholder="이름 입력(선택)"
          maxLength={12}
        />
      </div>

      <div className="abraca-field">
        <label className="abraca-label">게임 난이도</label>
        <div className="abraca-difficulty-row">
          {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              className={`abraca-difficulty-btn${difficulty === d ? ' active' : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="abraca-btn primary" onClick={() => onStart(p1, p2, difficulty)}>
        2인 게임 시작
      </button>
      <button type="button" className="abraca-btn ghost" onClick={onBack}>
        나가기
      </button>
    </div>
  )
}
