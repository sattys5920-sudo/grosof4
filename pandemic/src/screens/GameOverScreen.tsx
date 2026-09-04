import type { GameState } from '../engine/types'

export default function GameOverScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const won = state.result === 'win'
  return (
    <div className="gameover">
      <div className="gameover-card">
        {won ? (
          <>
            <div className="gameover-icon">🎉</div>
            <h1 className="gameover-title win">인류가 질병을 극복했습니다!</h1>
            <p className="gameover-desc">4개의 치료제가 모두 개발되었습니다.</p>
          </>
        ) : (
          <>
            <div className="gameover-icon">☠️</div>
            <h1 className="gameover-title lose">인류는 패배했습니다.</h1>
            <p className="gameover-desc">원인: {state.loseReason}</p>
          </>
        )}

        <div className="gameover-stats">
          <div>
            <span className="k">턴</span>
            <span className="v">{state.turn}</span>
          </div>
          <div>
            <span className="k">확산 횟수</span>
            <span className="v">{state.outbreakCount}</span>
          </div>
          <div>
            <span className="k">치료제</span>
            <span className="v">{Object.values(state.cured).filter(Boolean).length} / 4</span>
          </div>
        </div>

        <div className="gameover-actions">
          <button className="btn btn-primary" onClick={onRestart}>
            {won ? '다시 플레이' : '다시 도전'}
          </button>
          <button className="btn" onClick={onRestart}>
            메인으로
          </button>
        </div>
      </div>
    </div>
  )
}
