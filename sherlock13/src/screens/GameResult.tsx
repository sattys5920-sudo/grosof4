import type { GameResult, Role } from '../engine/types'
import { SUSPECT_MAP } from '../engine/suspects'
import SuspectCard from '../components/SuspectCard'

export default function GameResultScreen({
  result,
  role,
  onPlayAgain,
  onExit,
}: {
  result: GameResult
  role: Role
  onPlayAgain: () => void
  onExit: () => void
}) {
  const won = result.winner === role
  const criminal = SUSPECT_MAP[result.criminalId]

  return (
    <div className="result-screen">
      <p className="result-eyebrow">{won ? 'CASE SOLVED' : 'CASE FAILED'}</p>
      <h1 className={`result-title ${won ? 'win' : 'lose'}`}>{won ? '사건을 해결했습니다' : '추리가 빗나갔습니다'}</h1>
      <p className="result-sub">범인은</p>
      <SuspectCard suspect={criminal} size="lg" />
      <p className="result-detail">
        {result.correct
          ? `${result.winner === role ? '당신' : '상대'}의 고발이 정확히 적중했습니다.`
          : `${result.winner === role ? '상대' : '당신'}의 고발이 빗나갔습니다.`}
      </p>
      <div className="result-actions">
        <button type="button" className="menu-btn primary" onClick={onPlayAgain}>
          새 게임 만들기
        </button>
        <button type="button" className="menu-btn ghost" onClick={onExit}>
          메인으로
        </button>
      </div>
    </div>
  )
}
