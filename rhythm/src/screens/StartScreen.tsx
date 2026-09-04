import { useState } from 'react'
import type { Difficulty } from '../engine/types'
import { loadBest } from '../engine/save'

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '쉬움', normal: '보통', hard: '어려움' }
const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: '노트 수가 적고 여유롭게 판정합니다.',
  normal: '적당한 밀도로 표준 판정을 씁니다.',
  hard: '노트가 촘촘하고 빡빡하게 판정합니다.',
}

export default function StartScreen({ onReady }: { onReady: (file: File, difficulty: Difficulty) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const best = file ? loadBest(file.name, file.size, difficulty) : null

  async function handleStart() {
    if (!file || status === 'analyzing') return
    setStatus('analyzing')
    setErrorMsg('')
    try {
      await onReady(file, difficulty)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : '오디오 파일을 분석하지 못했습니다.')
    }
  }

  return (
    <div className="start-screen">
      <div className="start-card">
        <h1 className="start-title">내 노래 리듬게임</h1>
        <p className="start-sub">가지고 있는 mp3(또는 wav) 파일을 고르면, 자동으로 박자를 분석해서 4키 낙하 채보를 만들어 드려요.</p>
        <p className="start-note">파일은 서버로 전송되지 않고 이 브라우저 안에서만 분석·재생됩니다.</p>

        <label className="file-drop">
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
              setStatus('idle')
              setErrorMsg('')
            }}
          />
          {file ? (
            <span className="file-drop-name">🎵 {file.name}</span>
          ) : (
            <span className="file-drop-placeholder">클릭해서 음악 파일 선택</span>
          )}
        </label>

        <div className="difficulty-picker">
          {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              className={`difficulty-btn ${difficulty === d ? 'active' : ''}`}
              onClick={() => setDifficulty(d)}
            >
              <span className="difficulty-name">{DIFFICULTY_LABEL[d]}</span>
              <span className="difficulty-desc">{DIFFICULTY_DESC[d]}</span>
            </button>
          ))}
        </div>

        {best && (
          <p className="start-best">
            이 곡 · {DIFFICULTY_LABEL[difficulty]} 최고 기록: <strong>{best.score.toLocaleString()}점</strong> (최대 콤보 {best.maxCombo}, 정확도{' '}
            {best.accuracy.toFixed(1)}%)
          </p>
        )}

        {status === 'error' && <p className="start-error">{errorMsg}</p>}

        <button type="button" className="start-btn" disabled={!file || status === 'analyzing'} onClick={handleStart}>
          {status === 'analyzing' ? '분석 중…' : '시작하기'}
        </button>

        <div className="start-keys">
          <span className="key-chip">D</span>
          <span className="key-chip">F</span>
          <span className="key-chip">J</span>
          <span className="key-chip">K</span>
          <span className="start-keys-label">네 개의 키로 내려오는 노트를 판정선에 맞춰 눌러요.</span>
        </div>
      </div>
    </div>
  )
}
