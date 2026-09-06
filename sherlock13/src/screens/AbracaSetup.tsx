import { useState } from 'react'
import type { Difficulty } from '../engine/abracawhat'

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' }

type Mode = 'idle' | 'join'

export default function AbracaSetup({
  onCreate,
  onJoin,
  onBack,
  busy,
  errorMsg,
}: {
  onCreate: (name: string, difficulty: Difficulty) => void
  onJoin: (code: string, name: string) => void
  onBack: () => void
  busy: boolean
  errorMsg: string
}) {
  const [mode, setMode] = useState<Mode>('idle')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
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

      {errorMsg && <p className="abraca-error">{errorMsg}</p>}

      {mode === 'idle' && (
        <>
          <div className="abraca-field">
            <label className="abraca-label">내 이름</label>
            <input
              className="abraca-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          <button type="button" className="abraca-btn primary" disabled={busy} onClick={() => onCreate(name, difficulty)}>
            {busy ? '방 만드는 중…' : '방 만들기'}
          </button>
          <button type="button" className="abraca-btn" disabled={busy} onClick={() => setMode('join')}>
            초대 코드로 입장하기
          </button>
          <button type="button" className="abraca-btn ghost" disabled={busy} onClick={onBack}>
            나가기
          </button>
        </>
      )}

      {mode === 'join' && (
        <>
          <div className="abraca-field">
            <label className="abraca-label">내 이름</label>
            <input
              className="abraca-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름 입력(선택)"
              maxLength={12}
            />
          </div>
          <div className="abraca-field">
            <label className="abraca-label">초대 코드</label>
            <input
              className="abraca-input abraca-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="4자리 코드"
              maxLength={6}
              autoFocus
            />
          </div>
          <button type="button" className="abraca-btn primary" disabled={busy || code.trim().length === 0} onClick={() => onJoin(code, name)}>
            {busy ? '입장하는 중…' : '입장하기'}
          </button>
          <button type="button" className="abraca-btn ghost" disabled={busy} onClick={() => setMode('idle')}>
            뒤로
          </button>
        </>
      )}
    </div>
  )
}
