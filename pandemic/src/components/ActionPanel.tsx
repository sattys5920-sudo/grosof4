import { useState } from 'react'
import { CITIES, CITY_IDS } from '../engine/map'
import { cureCardsRequired } from '../engine/jobs'
import {
  buildStation,
  charterFlight,
  contingencyStash,
  directFlight,
  discoverCure,
  dispatcherMove,
  dispatcherRendezvous,
  driveTo,
  operationsShuttle,
  otherPlayerId,
  pass,
  shareKnowledge,
  shuttleFlight,
  treatDisease,
} from '../engine/actions'
import { STATIONS_MAX } from '../engine/gameEngine'
import type { CityId, DiseaseColor, GameState } from '../engine/types'

const COLOR_LABEL: Record<DiseaseColor, string> = { blue: '파란색', yellow: '노란색', black: '검은색', red: '빨간색' }

type Step =
  | { kind: 'drive' }
  | { kind: 'directFlight' }
  | { kind: 'charterFlight' }
  | { kind: 'shuttleFlight' }
  | { kind: 'operationsShuttleDiscard' }
  | { kind: 'operationsShuttleDestination'; discardCity: CityId }
  | { kind: 'buildRelocate' }
  | { kind: 'treat' }
  | { kind: 'discoverCure' }
  | { kind: 'shareDirection' }
  | { kind: 'shareGiveCard' }
  | { kind: 'shareReceiveCard' }
  | { kind: 'dispatcherTarget' }
  | { kind: 'dispatcherMoveKind'; targetPlayer: 'p1' | 'p2' }
  | { kind: 'dispatcherDestination'; targetPlayer: 'p1' | 'p2'; moveKind: 'drive' | 'directFlight' | 'charterFlight' | 'shuttleFlight' }
  | { kind: 'dispatcherRendezvousPick' }
  | { kind: 'contingencyPick' }

export default function ActionPanel({ state, onChange }: { state: GameState; onChange: (s: GameState) => void }) {
  const [step, setStep] = useState<Step | null>(null)
  const pid = state.currentPlayer
  const p = state.players[pid]
  const other = otherPlayerId(pid)
  const disabled = state.actionsLeft <= 0

  const run = (next: GameState) => {
    setStep(null)
    onChange(next)
  }

  const cancel = <button className="picker-cancel" onClick={() => setStep(null)}>취소</button>

  // renderStep()이 아래 값들을 참조하므로, "이미 선택 단계 중" 케이스로
  // 조기 반환하기 전에 전부 먼저 계산해 둬야 한다 (TDZ 오류 방지).
  const cityCards = p.hand.filter((c) => c.kind === 'city')
  const hasCurrentCityCard = cityCards.some((c) => c.kind === 'city' && c.city === p.location)
  const canCharter = hasCurrentCityCard
  const canDirect = cityCards.some((c) => c.kind === 'city' && c.city !== p.location)
  const canShuttle = state.stations.includes(p.location) && state.stations.length > 1
  const canOpsShuttle = p.job === 'operationsExpert' && state.stations.includes(p.location) && !state.usedOperationsShuttle[pid] && cityCards.length > 0
  const canBuild = !state.stations.includes(p.location) && (p.job === 'operationsExpert' || hasCurrentCityCard)
  const cubesHere = state.cubes[p.location] ?? {}
  const canTreat = Object.values(cubesHere).some((n) => (n ?? 0) > 0)
  const cureableColor = (Object.keys(COLOR_LABEL) as DiseaseColor[]).find(
    (color) => !state.cured[color] && cityCards.filter((c) => c.kind === 'city' && CITIES[c.city].color === color).length >= cureCardsRequired(p.job),
  )
  const canCure = state.stations.includes(p.location) && cureableColor !== undefined
  const canShare = state.players[other].location === p.location
  const canDispatcher = p.job === 'dispatcher'
  const canContingency = p.job === 'contingencyPlanner' && !p.contingencyCard && state.playerDiscard.some((c) => c.kind === 'event')

  if (step) {
    return <div className="action-panel">{renderStep()}</div>
  }

  return (
    <div className="action-panel">
      <div className="action-buttons">
        <button disabled={disabled} onClick={() => setStep({ kind: 'drive' })}>🚶 이동</button>
        <button disabled={disabled || !canDirect} onClick={() => setStep({ kind: 'directFlight' })}>✈️ 직항기</button>
        <button disabled={disabled || !canCharter} onClick={() => setStep({ kind: 'charterFlight' })}>✈️ 전세기</button>
        <button disabled={disabled || !canShuttle} onClick={() => setStep({ kind: 'shuttleFlight' })}>🛫 정기 항공편</button>
        {p.job === 'operationsExpert' && (
          <button disabled={disabled || !canOpsShuttle} onClick={() => setStep({ kind: 'operationsShuttleDiscard' })}>
            🏗️ 카드 버리고 이동
          </button>
        )}
        <button disabled={disabled || !canBuild} onClick={() => attemptBuild()}>🏢 연구소 건설</button>
        <button disabled={disabled || !canTreat} onClick={() => setStep({ kind: 'treat' })}>💊 치료</button>
        <button disabled={disabled || !canCure} onClick={() => setStep({ kind: 'discoverCure' })}>🔬 치료제 개발</button>
        <button disabled={disabled || !canShare} onClick={() => setStep({ kind: 'shareDirection' })}>🤝 정보 공유</button>
        {canDispatcher && (
          <>
            <button disabled={disabled} onClick={() => setStep({ kind: 'dispatcherTarget' })}>🧭 대신 이동시키기</button>
            <button disabled={disabled} onClick={() => setStep({ kind: 'dispatcherRendezvousPick' })}>🧭 합류시키기</button>
          </>
        )}
        {p.job === 'contingencyPlanner' && (
          <button disabled={disabled || !canContingency} onClick={() => setStep({ kind: 'contingencyPick' })}>
            📌 이벤트 카드 확보
          </button>
        )}
        <button disabled={disabled} onClick={() => run(pass(state, pid))}>⏭️ 패스</button>
      </div>
    </div>
  )

  function attemptBuild() {
    if (state.stations.length >= STATIONS_MAX && !state.stations.includes(p.location)) {
      setStep({ kind: 'buildRelocate' })
    } else {
      run(buildStation(state, pid))
    }
  }

  function CityList({ cities, onPick }: { cities: CityId[]; onPick: (c: CityId) => void }) {
    return (
      <div className="picker-grid">
        {cities.map((c) => (
          <button key={c} className="picker-item" onClick={() => onPick(c)}>
            {CITIES[c].name}
          </button>
        ))}
      </div>
    )
  }

  function renderStep() {
    if (!step) return null
    switch (step.kind) {
      case 'drive':
        return (
          <>
            <div className="picker-title">인접 도시로 이동</div>
            <CityList cities={CITIES[p.location].connections} onPick={(c) => run(driveTo(state, pid, c))} />
            {cancel}
          </>
        )
      case 'directFlight':
        return (
          <>
            <div className="picker-title">직항기 — 버릴 카드(=목적지) 선택</div>
            <CityList
              cities={cityCards.filter((c) => c.kind === 'city' && c.city !== p.location).map((c) => (c as { city: CityId }).city)}
              onPick={(c) => run(directFlight(state, pid, c))}
            />
            {cancel}
          </>
        )
      case 'charterFlight':
        return (
          <>
            <div className="picker-title">전세기 — 목적지 선택 ({CITIES[p.location].name} 카드를 버립니다)</div>
            <CityList cities={CITY_IDS.filter((c) => c !== p.location)} onPick={(c) => run(charterFlight(state, pid, c))} />
            {cancel}
          </>
        )
      case 'shuttleFlight':
        return (
          <>
            <div className="picker-title">정기 항공편 — 연구소가 있는 도시로 이동</div>
            <CityList cities={state.stations.filter((c) => c !== p.location)} onPick={(c) => run(shuttleFlight(state, pid, c))} />
            {cancel}
          </>
        )
      case 'operationsShuttleDiscard':
        return (
          <>
            <div className="picker-title">버릴 카드 선택</div>
            <CityList cities={cityCards.map((c) => (c as { city: CityId }).city)} onPick={(c) => setStep({ kind: 'operationsShuttleDestination', discardCity: c })} />
            {cancel}
          </>
        )
      case 'operationsShuttleDestination':
        return (
          <>
            <div className="picker-title">목적지 선택</div>
            <CityList cities={CITY_IDS.filter((c) => c !== p.location)} onPick={(c) => run(operationsShuttle(state, pid, c, step.discardCity))} />
            {cancel}
          </>
        )
      case 'buildRelocate':
        return (
          <>
            <div className="picker-title">연구소가 이미 6개입니다. 옮길 연구소를 선택하세요</div>
            <CityList cities={state.stations} onPick={(c) => run(buildStation(state, pid, c))} />
            {cancel}
          </>
        )
      case 'treat':
        return (
          <>
            <div className="picker-title">치료할 색상 선택</div>
            <div className="picker-grid">
              {(Object.keys(COLOR_LABEL) as DiseaseColor[])
                .filter((color) => (cubesHere[color] ?? 0) > 0)
                .map((color) => (
                  <button key={color} className="picker-item" onClick={() => run(treatDisease(state, pid, color))}>
                    {COLOR_LABEL[color]} ({cubesHere[color]})
                  </button>
                ))}
            </div>
            {cancel}
          </>
        )
      case 'discoverCure':
        return (
          <>
            <div className="picker-title">치료제를 개발할 색상 선택</div>
            <div className="picker-grid">
              {(Object.keys(COLOR_LABEL) as DiseaseColor[])
                .filter((color) => !state.cured[color] && cityCards.filter((c) => c.kind === 'city' && CITIES[c.city].color === color).length >= cureCardsRequired(p.job))
                .map((color) => (
                  <button key={color} className="picker-item" onClick={() => run(discoverCure(state, pid, color))}>
                    {COLOR_LABEL[color]}
                  </button>
                ))}
            </div>
            {cancel}
          </>
        )
      case 'shareDirection':
        return (
          <>
            <div className="picker-title">정보 공유</div>
            <div className="picker-grid">
              <button className="picker-item" onClick={() => setStep({ kind: 'shareGiveCard' })}>카드 주기</button>
              <button className="picker-item" onClick={() => setStep({ kind: 'shareReceiveCard' })}>카드 받기</button>
            </div>
            {cancel}
          </>
        )
      case 'shareGiveCard': {
        const giveable = p.job === 'researcher' ? cityCards : cityCards.filter((c) => c.kind === 'city' && c.city === p.location)
        return (
          <>
            <div className="picker-title">줄 카드 선택</div>
            <CityList cities={giveable.map((c) => (c as { city: CityId }).city)} onPick={(c) => run(shareKnowledge(state, pid, other, c))} />
            {cancel}
          </>
        )
      }
      case 'shareReceiveCard': {
        const otherPlayer = state.players[other]
        const receivable = otherPlayer.job === 'researcher' ? otherPlayer.hand.filter((c) => c.kind === 'city') : otherPlayer.hand.filter((c) => c.kind === 'city' && c.city === p.location)
        return (
          <>
            <div className="picker-title">받을 카드 선택</div>
            <CityList cities={receivable.map((c) => (c as { city: CityId }).city)} onPick={(c) => run(shareKnowledge(state, other, pid, c))} />
            {cancel}
          </>
        )
      }
      case 'dispatcherTarget':
        return (
          <>
            <div className="picker-title">대신 이동시킬 플레이어</div>
            <div className="picker-grid">
              <button className="picker-item" onClick={() => setStep({ kind: 'dispatcherMoveKind', targetPlayer: 'p1' })}>플레이어 1</button>
              <button className="picker-item" onClick={() => setStep({ kind: 'dispatcherMoveKind', targetPlayer: 'p2' })}>플레이어 2</button>
            </div>
            {cancel}
          </>
        )
      case 'dispatcherMoveKind': {
        const target = state.players[step.targetPlayer]
        return (
          <>
            <div className="picker-title">이동 방식 선택 ({target.location === undefined ? '' : CITIES[target.location].name}에서)</div>
            <div className="picker-grid">
              <button className="picker-item" onClick={() => setStep({ kind: 'dispatcherDestination', targetPlayer: step.targetPlayer, moveKind: 'drive' })}>인접 이동</button>
              <button className="picker-item" onClick={() => setStep({ kind: 'dispatcherDestination', targetPlayer: step.targetPlayer, moveKind: 'directFlight' })}>직항기</button>
              <button className="picker-item" onClick={() => setStep({ kind: 'dispatcherDestination', targetPlayer: step.targetPlayer, moveKind: 'charterFlight' })}>전세기</button>
              <button className="picker-item" onClick={() => setStep({ kind: 'dispatcherDestination', targetPlayer: step.targetPlayer, moveKind: 'shuttleFlight' })}>정기 항공편</button>
            </div>
            {cancel}
          </>
        )
      }
      case 'dispatcherDestination': {
        const target = state.players[step.targetPlayer]
        let cities: CityId[] = []
        if (step.moveKind === 'drive') cities = CITIES[target.location].connections
        else if (step.moveKind === 'directFlight') cities = target.hand.filter((c) => c.kind === 'city').map((c) => (c as { city: CityId }).city)
        else if (step.moveKind === 'charterFlight') cities = CITY_IDS.filter((c) => c !== target.location)
        else cities = state.stations.filter((c) => c !== target.location)
        return (
          <>
            <div className="picker-title">목적지 선택</div>
            <CityList cities={cities} onPick={(c) => run(dispatcherMove(state, pid, step.targetPlayer, step.moveKind, c))} />
            {cancel}
          </>
        )
      }
      case 'dispatcherRendezvousPick':
        return (
          <>
            <div className="picker-title">누구를 상대방 도시로 합류시킬까요?</div>
            <div className="picker-grid">
              <button className="picker-item" onClick={() => run(dispatcherRendezvous(state, pid, 'p1'))}>플레이어 1 이동</button>
              <button className="picker-item" onClick={() => run(dispatcherRendezvous(state, pid, 'p2'))}>플레이어 2 이동</button>
            </div>
            {cancel}
          </>
        )
      case 'contingencyPick': {
        const events = state.playerDiscard.filter((c) => c.kind === 'event')
        return (
          <>
            <div className="picker-title">버림 더미에서 확보할 이벤트 카드</div>
            <div className="picker-grid">
              {events.map((c, i) => (
                <button key={i} className="picker-item" onClick={() => c.kind === 'event' && run(contingencyStash(state, pid, c.event))}>
                  {c.kind === 'event' ? c.event : ''}
                </button>
              ))}
            </div>
            {cancel}
          </>
        )
      }
    }
  }
}
