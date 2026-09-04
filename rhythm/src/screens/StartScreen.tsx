import { useState } from 'react'
import type { Difficulty } from '../engine/types'
import { loadBest, builtinSongKey } from '../engine/save'
import { BUILTIN_SONGS, type BuiltinSong } from '../engine/songs'

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '쉬움', normal: '보통', hard: '어려움' }

function BestBadge({ songKey, difficulty, busy }: { songKey: string; difficulty: Difficulty; busy: boolean }) {
  if (busy) return <span className="playlist-row-busy">분석 중…</span>
  const best = loadBest(songKey, difficulty)
  if (!best) return <span className="playlist-row-best playlist-row-best-empty">기록 없음</span>
  return (
    <span className="playlist-row-best">
      {best.score.toLocaleString()}점 · {best.accuracy.toFixed(1)}%
    </span>
  )
}

export default function StartScreen({
  onReadyBuiltin,
  onShowRanking,
}: {
  onReadyBuiltin: (song: BuiltinSong, difficulty: Difficulty) => Promise<void>
  onShowRanking: () => void
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [activeKey, setActiveKey] = useState<string | null>(null)

  async function run(key: string, action: () => Promise<void>) {
    if (status === 'analyzing') return
    setActiveKey(key)
    setStatus('analyzing')
    setErrorMsg('')
    try {
      await action()
    } catch (err) {
      setStatus('error')
      setActiveKey(null)
      setErrorMsg(err instanceof Error ? err.message : '오디오 파일을 분석하지 못했어요.')
    }
  }

  return (
    <div className="start-screen">
      <div className="start-card start-card-wide">
        <h1 className="start-title-sm">곡 선택</h1>

        <div className="difficulty-picker">
          {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
            <button key={d} type="button" className={`difficulty-btn ${difficulty === d ? 'active' : ''}`} onClick={() => setDifficulty(d)}>
              <span className="difficulty-name">{DIFFICULTY_LABEL[d]}</span>
            </button>
          ))}
        </div>

        {status === 'error' && <p className="start-error">{errorMsg}</p>}

        <button type="button" className="start-ranking-btn" onClick={onShowRanking}>
          🏆 랭킹 보기
        </button>

        <h2 className="playlist-section-title">수록곡</h2>
        <div className="playlist-list">
          {BUILTIN_SONGS.map((song, i) => {
            const key = builtinSongKey(song.id)
            return (
              <button
                key={song.id}
                type="button"
                className="playlist-row"
                disabled={status === 'analyzing'}
                onClick={() => run(key, () => onReadyBuiltin(song, difficulty))}
              >
                <span className="playlist-row-num">{i + 1}</span>
                <span className="playlist-row-name">{song.title}</span>
                <BestBadge songKey={key} difficulty={difficulty} busy={status === 'analyzing' && activeKey === key} />
              </button>
            )
          })}
        </div>

        <div className="start-keys">
          <span className="key-chip">D</span>
          <span className="key-chip">F</span>
          <span className="key-chip">G</span>
          <span className="key-chip">H</span>
          <span className="key-chip">J</span>
          <span className="start-keys-label">내려오는 노트를 판정선에 맞춰 키보드로 누르거나, 휴대폰에서는 화면 아래 5개 버튼을 터치하세요.</span>
        </div>
      </div>
    </div>
  )
}
