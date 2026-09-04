import { useState } from 'react'
import type { Difficulty } from '../engine/types'
import { loadBest, fileSongKey, builtinSongKey } from '../engine/save'
import { BUILTIN_SONGS, type BuiltinSong } from '../engine/songs'

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '쉬움', normal: '보통', hard: '어려움' }
const DIFFICULTY_DESC: Record<Difficulty, string> = {
  easy: '노트 수가 적고 여유롭게 판정합니다.',
  normal: '적당한 밀도로 표준 판정을 씁니다.',
  hard: '노트가 촘촘하고 빡빡하게 판정합니다.',
}

function cleanName(fileName: string): string {
  return fileName.replace(/\.[^./]+$/, '')
}

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
  playlist,
  onPlaylistChange,
  onReady,
  onReadyBuiltin,
}: {
  playlist: File[]
  onPlaylistChange: (files: File[]) => void
  onReady: (file: File, difficulty: Difficulty) => Promise<void>
  onReadyBuiltin: (song: BuiltinSong, difficulty: Difficulty) => Promise<void>
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [activeKey, setActiveKey] = useState<string | null>(null)

  function handleFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? [])
    if (list.length > 0) onPlaylistChange([...playlist, ...list])
    e.target.value = ''
  }

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
        <p className="start-note">파일은 서버로 전송되지 않고 이 브라우저 안에서만 분석·재생됩니다.</p>

        <div className="difficulty-picker">
          {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
            <button key={d} type="button" className={`difficulty-btn ${difficulty === d ? 'active' : ''}`} onClick={() => setDifficulty(d)}>
              <span className="difficulty-name">{DIFFICULTY_LABEL[d]}</span>
              <span className="difficulty-desc">{DIFFICULTY_DESC[d]}</span>
            </button>
          ))}
        </div>

        {status === 'error' && <p className="start-error">{errorMsg}</p>}

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
                <span className="playlist-row-names">
                  <span className="playlist-row-name">{song.title}</span>
                  <span className="playlist-row-subname">{song.song}</span>
                </span>
                <BestBadge songKey={key} difficulty={difficulty} busy={status === 'analyzing' && activeKey === key} />
              </button>
            )
          })}
        </div>

        <div className="playlist-header">
          <h2 className="playlist-section-title">내 파일 추가</h2>
          {playlist.length > 0 && (
            <button type="button" className="playlist-reset-btn" onClick={() => onPlaylistChange([])}>
              목록 비우기
            </button>
          )}
        </div>

        <label className="file-drop">
          <input type="file" accept="audio/*" multiple onChange={handleFilesChosen} />
          <span className="file-drop-placeholder">클릭해서 내 mp3(또는 wav) 파일 추가</span>
        </label>

        {playlist.length > 0 && (
          <div className="playlist-list">
            {playlist.map((file, i) => {
              const key = fileSongKey(file.name, file.size)
              return (
                <button
                  key={`${key}-${i}`}
                  type="button"
                  className="playlist-row"
                  disabled={status === 'analyzing'}
                  onClick={() => run(key, () => onReady(file, difficulty))}
                >
                  <span className="playlist-row-num">{i + 1}</span>
                  <span className="playlist-row-name">{cleanName(file.name)}</span>
                  <BestBadge songKey={key} difficulty={difficulty} busy={status === 'analyzing' && activeKey === key} />
                </button>
              )
            })}
          </div>
        )}

        <div className="start-keys">
          <span className="key-chip">D</span>
          <span className="key-chip">F</span>
          <span className="key-chip">J</span>
          <span className="key-chip">K</span>
          <span className="start-keys-label">내려오는 노트를 판정선에 맞춰 키보드로 누르거나, 휴대폰에서는 화면 아래 4개 버튼을 터치하세요.</span>
        </div>
      </div>
    </div>
  )
}
