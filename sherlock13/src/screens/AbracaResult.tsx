import type { AbracaRole, AbracaRoomDoc } from '../engine/abracaTypes'

export default function AbracaResult({ room, myRole, onExit }: { room: AbracaRoomDoc; myRole: AbracaRole; onExit: () => void }) {
  const winnerRole = room.winner ?? 'host'
  const loserRole: AbracaRole = winnerRole === 'host' ? 'guest' : 'host'
  const won = winnerRole === myRole

  return (
    <div className="abraca-theme abraca-result">
      <p className="abraca-result-eyebrow">✨ GAME OVER ✨</p>
      <h1 className="abraca-result-title">{won ? '당신의 승리!' : `${room[winnerRole].name} 승리!`}</h1>
      <p className="abraca-result-detail">{room[loserRole].name}의 모든 체력이 사라졌습니다.</p>
      <div className="abraca-result-actions">
        <button type="button" className="abraca-btn ghost" onClick={onExit}>
          메인으로
        </button>
      </div>
    </div>
  )
}
