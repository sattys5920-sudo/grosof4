import { useEffect, useState } from 'react'
import type { Difficulty } from '../engine/types'
import { fetchRanking, type RankingEntry } from '../engine/ranking'
import { firebaseConfigured } from '../firebase'
import { BUILTIN_SONGS } from '../engine/songs'

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: '쉬움', normal: '보통', hard: '어려움' }

export default function RankingScreen({ onBack }: { onBack: () => void }) {
  const [songId, setSongId] = useState(BUILTIN_SONGS[0].id)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [entries, setEntries] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchRanking(songId, difficulty).then((result) => {
      if (!cancelled) {
        setEntries(result)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [songId, difficulty])

  return (
    <div className="start-screen">
      <div className="start-card start-card-wide">
        <h1 className="start-title-sm">랭킹</h1>

        <select className="ranking-song-select" value={songId} onChange={(e) => setSongId(e.target.value)}>
          {BUILTIN_SONGS.map((song) => (
            <option key={song.id} value={song.id}>
              {song.title}
            </option>
          ))}
        </select>

        <div className="difficulty-picker">
          {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
            <button key={d} type="button" className={`difficulty-btn ${difficulty === d ? 'active' : ''}`} onClick={() => setDifficulty(d)}>
              <span className="difficulty-name">{DIFFICULTY_LABEL[d]}</span>
            </button>
          ))}
        </div>

        {!firebaseConfigured && <p className="start-error">랭킹 서버가 설정되지 않았어요.</p>}

        {firebaseConfigured && (
          <div className="ranking-list">
            {loading && <p className="ranking-empty">불러오는 중…</p>}
            {!loading && entries.length === 0 && <p className="ranking-empty">아직 기록이 없어요. 첫 기록의 주인공이 되어 보세요!</p>}
            {!loading &&
              entries.map((entry, i) => (
                <div key={entry.nickname} className={`ranking-row ${i < 3 ? `ranking-row-top${i + 1}` : ''}`}>
                  <span className="ranking-rank">{i + 1}</span>
                  <span className="ranking-nickname">{entry.nickname}</span>
                  <span className="ranking-score">
                    {entry.score.toLocaleString()}점 · {entry.accuracy.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        )}

        <button type="button" className="result-btn" onClick={onBack}>
          돌아가기
        </button>
      </div>
    </div>
  )
}
