import { CITIES } from '../engine/map'
import { JOBS } from '../engine/jobs'
import { EVENT_INFO } from '../engine/eventCards'
import type { GameState, PlayerCard } from '../engine/types'

function cardLabel(card: PlayerCard): string {
  if (card.kind === 'city') return CITIES[card.city].name
  if (card.kind === 'epidemic') return '전염'
  return EVENT_INFO[card.event].name
}

function cardColor(card: PlayerCard): string {
  if (card.kind === 'city') return CITIES[card.city].color
  return 'event'
}

export default function PlayerPanel({
  state,
  playerId,
  active,
  onPlayEvent,
}: {
  state: GameState
  playerId: 'p1' | 'p2'
  active: boolean
  onPlayEvent?: (card: Extract<PlayerCard, { kind: 'event' }>) => void
}) {
  const p = state.players[playerId]
  const job = JOBS[p.job]

  return (
    <div className={`player-panel ${active ? 'active' : ''}`}>
      <div className="player-panel-header">
        <span className="player-panel-name">{playerId === 'p1' ? '🔵 플레이어 1' : '🟠 플레이어 2'}</span>
        {active && <span className="player-panel-turn">차례</span>}
      </div>
      <div className="player-panel-job" style={{ color: job.color }}>
        {job.name}
      </div>
      <div className="player-panel-location">📍 {CITIES[p.location].name}</div>
      <div className="player-panel-ability">{job.description}</div>
      {p.contingencyCard && (
        <div className="player-panel-contingency">
          보관 중: <strong>{EVENT_INFO[p.contingencyCard].name}</strong> — {EVENT_INFO[p.contingencyCard].description}
        </div>
      )}

      <div className="player-panel-hand-label">손패 {p.hand.length}장</div>
      <div className="player-panel-hand">
        {p.hand.map((card, i) => (
          <div key={i} className={`hand-card color-${cardColor(card)}`}>
            <div className="hand-card-top">
              <span className="hand-card-label">
                {card.kind === 'event' && '📌 '}
                {cardLabel(card)}
              </span>
              {card.kind === 'event' && onPlayEvent && (
                <button className="hand-card-play" onClick={() => onPlayEvent(card as Extract<PlayerCard, { kind: 'event' }>)}>
                  사용
                </button>
              )}
            </div>
            {card.kind === 'event' && <div className="hand-card-desc">{EVENT_INFO[card.event].description}</div>}
          </div>
        ))}
        {p.hand.length === 0 && <div className="muted">손패 없음</div>}
      </div>
    </div>
  )
}
