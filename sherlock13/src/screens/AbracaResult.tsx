import type { AbracaState } from '../engine/abracawhat'

export default function AbracaResult({ state, onRestart, onExit }: { state: AbracaState; onRestart: () => void; onExit: () => void }) {
  const winnerIdx = state.winnerIndex ?? 0
  const loserIdx = winnerIdx === 0 ? 1 : 0
  const winner = state.players[winnerIdx]
  const loser = state.players[loserIdx]

  return (
    <div className="abraca-theme abraca-result">
      <p className="abraca-result-eyebrow">✨ GAME OVER ✨</p>
      <h1 className="abraca-result-title">{winner.name} 승리!</h1>
      <p className="abraca-result-detail">{loser.name}의 모든 체력이 사라졌습니다.</p>
      <div className="abraca-result-actions">
        <button type="button" className="abraca-btn primary" onClick={onRestart}>
          다시 플레이
        </button>
        <button type="button" className="abraca-btn ghost" onClick={onExit}>
          메인으로
        </button>
      </div>
    </div>
  )
}
