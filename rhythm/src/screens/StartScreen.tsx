import { useState } from 'react'
import type { Difficulty } from '../engine/types'
import { loadBest } from '../engine/save'

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '쉬움', normal: '보통', hard: '어려움' }
const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: '노트 수가 적고 여유롭게 판정합니다.',
  normal: '적당한 밀도로 표준 판정을 씁니다.',
  hard: '노트가 촘촘하고 빡빡하게 판정합니다.',
}

function cleanName(fileName: string): string {
  return fileName.replace(/\.[^./]+$/, '')
}

export default function StartScreen({
  playlist,
  onPlaylistChange,
  onReady,
}: {
  playlist: File[]
  onPlaylistChange: (files: File[]) => void
  onReady: (file: File, difficulty: Difficulty) => Promise<void>
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  function handleFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? [])
    if (list.length > 0) onPlaylistChange(list)
    e.target.value = ''
  }

  async function handlePlay(file: File, index: number) {
    if (status === 'analyzing') return
    setActiveIndex(index)
    setStatus('analyzing')
    setErrorMsg('')
    try {
      await onReady(file, difficulty)
    } catch (err) {
      setStatus('error')
      setActiveIndex(null)
      setErrorMsg(err instanceof Error ? err.message : '오디오 파일을 분석하지 못했어요.')
    }
  }

  const keysHint = (
    <div className="start-keys">
      <span className="key-chip">D</span>
      <span className="key-chip">F</span>
      <span className="key-chip">J</span>
      <span className="key-chip">K</span>
      <span className="start-keys-label">내려오는 노트를 판정선에 맞춰 키보드로 누르거나, 휴대폰에서는 화면 아래 4개 버튼을 터치하세요.</span>
    </div>
  )

  if (playlist.length === 0) {
    return (
      <div className="start-screen">
        <div className="start-card">
          <h1 className="start-title">내 노래 리듬게임</h1>
          <p className="start-sub">가지고 있는 mp3(또는 wav) 파일들을 한꺼번에 고르면, 곡마다 자동으로 박자를 분석해서 플레이리스트를 만들어 드려요.</p>
          <p className="start-note">파일은 서버로 전송되지 않고 이 브라우저 안에서만 분석·재생됩니다.</p>

          <label className="file-drop">
            <input type="file" accept="audio/*" multiple onChange={handleFilesChosen} />
            <span className="file-drop-placeholder">클릭해서 음악 파일 여러 개 선택 (12곡이면 12곡 한 번에)</span>
          </label>

          {keysHint}
        </div>
      </div>
    )
  }

  return (
    <div className="start-screen">
      <div className="start-card start-card-wide">
        <div className="playlist-header">
          <h1 className="start-title-sm">내 플레이리스트</h1>
          <button type="button" className="playlist-reset-btn" onClick={() => onPlaylistChange([])}>
            파일 다시 고르기
          </button>
        </div>

        <div className="difficulty-picker">
          {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
            <button key={d} type="button" className={`difficulty-btn ${difficulty === d ? 'active' : ''}`} onClick={() => setDifficulty(d)}>
              <span className="difficulty-name">{DIFFICULTY_LABEL[d]}</span>
              <span className="difficulty-desc">{DIFFICULTY_DESC[d]}</span>
            </button>
          ))}
        </div>

        {status === 'error' && <p className="start-error">{errorMsg}</p>}

        <div className="playlist-list">
          {playlist.map((file, i) => {
            const best = loadBest(file.name, file.size, difficulty)
            const busy = status === 'analyzing' && activeIndex === i
            return (
              <button
                key={`${file.name}-${file.size}-${i}`}
                type="button"
                className="playlist-row"
                disabled={status === 'analyzing'}
                onClick={() => handlePlay(file, i)}
              >
                <span className="playlist-row-num">{i + 1}</span>
                <span className="playlist-row-name">{cleanName(file.name)}</span>
                {busy ? (
                  <span className="playlist-row-busy">분석 중…</span>
                ) : best ? (
                  <span className="playlist-row-best">{best.score.toLocaleString()}점 · {best.accuracy.toFixed(1)}%</span>
                ) : (
                  <span className="playlist-row-best playlist-row-best-empty">기록 없음</span>
                )}
              </button>
            )
          })}
        </div>

        {keysHint}
      </div>
    </div>
  )
}
