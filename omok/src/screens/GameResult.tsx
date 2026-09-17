import type { GameResult, Role, RoomDoc } from '../engine/types'

export default function GameResultScreen({
  result,
  role,
  room,
  onPlayAgain,
  onExit,
}: {
  result: GameResult
  role: Role
  room: RoomDoc
  onPlayAgain: () => void
  onExit: () => void
}) {
  const won = result.winner === role
  const byTimeout = result.line.length === 0
  const winnerName = result.winner === 'host' ? room.hostName || '호스트(흑)' : room.guestName || '게스트(백)'

  return (
    <div className="result-screen">
      <p className="result-eyebrow">{won ? 'VICTORY' : 'DEFEAT'}</p>
      <h1 className={`result-title ${won ? 'win' : 'lose'}`}>{won ? '승리했습니다!' : '패배했습니다'}</h1>
      <p className="result-detail">
        {byTimeout ? `${winnerName}의 승리 (상대가 60초 안에 두지 못했습니다)` : `${winnerName}이(가) 오목을 완성했습니다`}
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
