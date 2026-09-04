import { useState } from 'react'
import GameBoard from '../components/GameBoard'
import PlayerPanel from '../components/PlayerPanel'
import ActionPanel from '../components/ActionPanel'
import GameLog from '../components/GameLog'
import { CITIES, CITY_IDS } from '../engine/map'
import { INFECTION_RATE_TRACK } from '../engine/infection'
import { discardCard } from '../engine/gameEngine'
import { playAirlift, playForecast, playGovernmentGrant, playOneQuietNight, playResilientPopulation } from '../engine/events'
import { saveGame, clearGame } from '../engine/save'
import type { CityId, EventId, GameState, PlayerCard } from '../engine/types'

const COLOR_LABEL: Record<string, string> = { blue: '파란색', yellow: '노란색', black: '검은색', red: '빨간색' }

type EventPending =
  | { event: 'airlift'; step: 'target' | 'destination'; targetPlayer?: 'p1' | 'p2' }
  | { event: 'governmentGrant' }
  | { event: 'oneQuietNight' }
  | { event: 'forecast'; order: CityId[] }
  | { event: 'resilientPopulation' }

export default function GameScreen({ state, onChange, onRestart }: { state: GameState; onChange: (s: GameState) => void; onRestart: () => void }) {
  const [eventPending, setEventPending] = useState<EventPending | null>(null)
  const [eventPlayer, setEventPlayer] = useState<'p1' | 'p2' | null>(null)

  const currentPlayer = state.currentPlayer
  const drawCount = INFECTION_RATE_TRACK[Math.min(state.infectionRateIndex, INFECTION_RATE_TRACK.length - 1)]

  function handleSave() {
    saveGame(state)
  }

  function handleRestart() {
    clearGame()
    onRestart()
  }

  function openEvent(playerId: 'p1' | 'p2', card: Extract<PlayerCard, { kind: 'event' }>) {
    setEventPlayer(playerId)
    if (card.event === 'airlift') setEventPending({ event: 'airlift', step: 'target' })
    else if (card.event === 'governmentGrant') setEventPending({ event: 'governmentGrant' })
    else if (card.event === 'oneQuietNight') setEventPending({ event: 'oneQuietNight' })
    else if (card.event === 'forecast') setEventPending({ event: 'forecast', order: state.infectionDeck.slice(0, 6) })
    else setEventPending({ event: 'resilientPopulation' })
  }

  function runEvent(next: GameState) {
    setEventPending(null)
    setEventPlayer(null)
    onChange(next)
  }

  if (state.phase === 'discard') {
    const pid = state.pendingDiscards[0]
    const hand = state.players[pid].hand
    return (
      <div className="game discard-overlay">
        <div className="discard-modal">
          <h2>손패 제한 초과</h2>
          <p>{pid === 'p1' ? '플레이어 1' : '플레이어 2'}의 손패가 7장을 넘었습니다. 카드를 버리세요.</p>
          <div className="picker-grid">
            {hand.map((card, i) => (
              <button key={i} className="picker-item" onClick={() => onChange(discardCard(state, pid, i))}>
                {card.kind === 'city' ? CITIES[card.city].name : card.kind === 'event' ? eventLabel(card.event) : '전염'}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (eventPending && eventPlayer) {
    return (
      <div className="game discard-overlay">
        <div className="discard-modal">
          <h2>이벤트 카드</h2>
          {renderEvent()}
          <button className="picker-cancel" onClick={() => setEventPending(null)}>취소</button>
        </div>
      </div>
    )
  }

  return (
    <div className="game">
      <header className="game-top">
        <div className="game-title">PANDEMIC</div>
        <div className="game-status">
          <span>{currentPlayer === 'p1' ? '🔵 플레이어 1' : '🟠 플레이어 2'}의 차례</span>
          <span>턴 {state.turn}</span>
          <span>행동 {state.actionsLeft} / 4</span>
          <span>확산 {state.outbreakCount} / 8</span>
          <span>감염률 {drawCount}</span>
          <span className="cure-markers">
            {(['blue', 'yellow', 'black', 'red'] as const).map((c) => (
              <span key={c} className={`cure-marker ${state.cured[c] ? 'cured' : ''} ${state.eradicated[c] ? 'eradicated' : ''}`}>
                {COLOR_LABEL[c][0]}
              </span>
            ))}
          </span>
        </div>
        <div className="game-top-buttons">
          <button className="btn" onClick={handleSave}>저장</button>
          <button className="btn" onClick={handleRestart}>게임 재시작</button>
        </div>
      </header>

      <div className="game-body">
        <div className="game-main">
          <GameBoard state={state} highlighted={[]} selectedCity={null} />
          <ActionPanel state={state} onChange={onChange} />
        </div>
        <div className="game-side">
          <PlayerPanel state={state} playerId="p1" active={currentPlayer === 'p1'} onPlayEvent={(c) => openEvent('p1', c)} />
          <PlayerPanel state={state} playerId="p2" active={currentPlayer === 'p2'} onPlayEvent={(c) => openEvent('p2', c)} />
          <GameLog log={state.log} />
        </div>
      </div>
    </div>
  )

  function renderEvent() {
    if (!eventPending || !eventPlayer) return null
    if (eventPending.event === 'airlift') {
      if (eventPending.step === 'target') {
        return (
          <div className="picker-grid">
            <button className="picker-item" onClick={() => setEventPending({ event: 'airlift', step: 'destination', targetPlayer: 'p1' })}>플레이어 1 이동</button>
            <button className="picker-item" onClick={() => setEventPending({ event: 'airlift', step: 'destination', targetPlayer: 'p2' })}>플레이어 2 이동</button>
          </div>
        )
      }
      return (
        <div className="picker-grid">
          {CITY_IDS.filter((c) => c !== state.players[eventPending.targetPlayer!].location).map((c) => (
            <button key={c} className="picker-item" onClick={() => runEvent(playAirlift(state, eventPlayer, eventPending.targetPlayer!, c))}>
              {CITIES[c].name}
            </button>
          ))}
        </div>
      )
    }
    if (eventPending.event === 'governmentGrant') {
      return (
        <div className="picker-grid">
          {CITY_IDS.filter((c) => !state.stations.includes(c)).map((c) => (
            <button key={c} className="picker-item" onClick={() => runEvent(playGovernmentGrant(state, eventPlayer, c, state.stations.length >= 6 ? state.stations[0] : undefined))}>
              {CITIES[c].name}
            </button>
          ))}
        </div>
      )
    }
    if (eventPending.event === 'oneQuietNight') {
      return (
        <div className="picker-grid">
          <button className="picker-item" onClick={() => runEvent(playOneQuietNight(state, eventPlayer))}>사용</button>
        </div>
      )
    }
    if (eventPending.event === 'resilientPopulation') {
      return (
        <div className="picker-grid">
          {state.infectionDiscard.map((c, i) => (
            <button key={i} className="picker-item" onClick={() => runEvent(playResilientPopulation(state, eventPlayer, c))}>
              {CITIES[c].name}
            </button>
          ))}
          {state.infectionDiscard.length === 0 && <p className="muted">감염 버림 더미가 비어 있습니다.</p>}
        </div>
      )
    }
    // forecast
    const order = eventPending.order
    return (
      <div>
        <p className="muted">위쪽이 다음에 뽑힐 카드입니다. 도시를 눌러 순서를 뒤로 보낼 수 있습니다.</p>
        <ol className="forecast-list">
          {order.map((c, i) => (
            <li key={i}>
              <button
                className="picker-item"
                onClick={() => {
                  const next = [...order]
                  const [item] = next.splice(i, 1)
                  next.push(item)
                  setEventPending({ event: 'forecast', order: next })
                }}
              >
                {i + 1}. {CITIES[c].name}
              </button>
            </li>
          ))}
        </ol>
        <button className="btn btn-primary" onClick={() => runEvent(playForecast(state, eventPlayer, order))}>
          이 순서로 확정
        </button>
      </div>
    )
  }
}

function eventLabel(id: EventId): string {
  switch (id) {
    case 'airlift':
      return '긴급 공중 수송'
    case 'governmentGrant':
      return '정부 보조금'
    case 'oneQuietNight':
      return '평온한 하룻밤'
    case 'forecast':
      return '예측'
    case 'resilientPopulation':
      return '항체 보유자'
  }
}
