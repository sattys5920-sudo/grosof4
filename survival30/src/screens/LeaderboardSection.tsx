import { useEffect, useState } from 'react'
import { fetchTopScores, isLeaderboardAvailable, submitScore, type LeaderboardEntry } from '../leaderboard'

export default function LeaderboardSection({ day, endingId, endingTitle }: { day: number; endingId: string; endingTitle: string }) {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [nickname, setNickname] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showBoard, setShowBoard] = useState(false)
  const [loadingBoard, setLoadingBoard] = useState(false)
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    isLeaderboardAvailable().then((ok) => {
      if (!cancelled) setAvailable(ok)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!available) return null

  const trimmed = nickname.trim().slice(0, 16)

  const handleSubmit = async () => {
    if (!trimmed || submitting) return
    setSubmitting(true)
    const ok = await submitScore({ nickname: trimmed, day, endingId, endingTitle })
    setSubmitting(false)
    if (ok) setSubmitted(true)
  }

  const handleShowBoard = async () => {
    const next = !showBoard
    setShowBoard(next)
    if (next) {
      setLoadingBoard(true)
      const top = await fetchTopScores(20)
      setBoard(top)
      setLoadingBoard(false)
    }
  }

  return (
    <div className="leaderboard-section">
      {!submitted ? (
        <div className="leaderboard-submit">
          <input
            className="leaderboard-input"
            type="text"
            placeholder="닉네임을 입력하고 랭킹에 등록"
            value={nickname}
            maxLength={16}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
            }}
          />
          <button className="btn" disabled={!trimmed || submitting} onClick={handleSubmit}>
            {submitting ? '등록 중…' : '랭킹에 등록'}
          </button>
        </div>
      ) : (
        <p className="leaderboard-done">"{trimmed}" 기록이 랭킹에 등록됐다. ({day}일 생존 · {endingTitle})</p>
      )}

      <button className="leaderboard-toggle" onClick={handleShowBoard}>
        {showBoard ? '랭킹 닫기' : '전체 랭킹 보기'}
      </button>

      {showBoard && (
        <div className="leaderboard-board">
          {loadingBoard && <p className="muted">불러오는 중…</p>}
          {!loadingBoard && board && board.length === 0 && <p className="muted">아직 등록된 기록이 없다.</p>}
          {!loadingBoard && board && board.length > 0 && (
            <ol className="leaderboard-list">
              {board.map((entry, i) => (
                <li key={i}>
                  <span className="leaderboard-rank">{i + 1}</span>
                  <span className="leaderboard-nickname">{entry.nickname}</span>
                  <span className="leaderboard-day">{entry.day}일</span>
                  <span className="leaderboard-ending">{entry.endingTitle}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
