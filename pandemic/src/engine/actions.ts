// 플레이어 행동 8종 + 운항 관리자 전용 이동 2종 + 대책 전문가 전용 행동.
// 행동 1회당 actionsLeft를 1 줄인다. 유효하지 않은 시도는 상태를 그대로
// 돌려준다 (UI에서 버튼을 비활성화해서 애초에 못 누르게 하는 게 원칙이지만,
// 엔진 자체도 방어적으로 막는다).
import { CITIES, isAdjacent } from './map'
import { cureCardsRequired } from './jobs'
import { colorName } from './infection'
import type { ActionParams, CityId, DiseaseColor, GameState, PlayerCard, PlayerState } from './types'

export function otherPlayerId(id: 'p1' | 'p2'): 'p1' | 'p2' {
  return id === 'p1' ? 'p2' : 'p1'
}

function isCityCard(card: PlayerCard, city?: CityId): card is Extract<PlayerCard, { kind: 'city' }> {
  return card.kind === 'city' && (city === undefined || card.city === city)
}

function findCityCardIndex(hand: PlayerCard[], city: CityId): number {
  return hand.findIndex((c) => isCityCard(c, city))
}

function log(state: GameState, text: string, tag: GameState['log'][number]['tag'] = 'action'): GameState {
  return { ...state, log: [{ turn: state.turn, text, tag }, ...state.log] }
}

function setPlayer(state: GameState, id: 'p1' | 'p2', patch: Partial<PlayerState>): GameState {
  return { ...state, players: { ...state.players, [id]: { ...state.players[id], ...patch } } }
}

function spendAction(state: GameState): GameState {
  return { ...state, actionsLeft: state.actionsLeft - 1 }
}

function checkHandLimit(state: GameState, id: 'p1' | 'p2'): GameState {
  if (state.players[id].hand.length <= 7) return state
  if (state.pendingDiscards.includes(id)) return state
  return { ...state, pendingDiscards: [...state.pendingDiscards, id] }
}

/** 인접 도시로 이동 (drive/ferry). */
export function driveTo(state: GameState, playerId: 'p1' | 'p2', destination: CityId): GameState {
  const p = state.players[playerId]
  if (!isAdjacent(p.location, destination)) return state
  let s = setPlayer(state, playerId, { location: destination })
  s = spendAction(s)
  return log(s, `${playerLabel(playerId)}이(가) ${CITIES[p.location].name}에서 ${CITIES[destination].name}(으)로 이동했습니다.`)
}

/** 직항기: 목적지 도시 카드를 버리고 그 도시로 이동. */
export function directFlight(state: GameState, playerId: 'p1' | 'p2', destination: CityId): GameState {
  const p = state.players[playerId]
  if (destination === p.location) return state
  const idx = findCityCardIndex(p.hand, destination)
  if (idx < 0) return state
  const hand = p.hand.filter((_, i) => i !== idx)
  let s = { ...state, playerDiscard: [...state.playerDiscard, p.hand[idx]] }
  s = setPlayer(s, playerId, { location: destination, hand })
  s = spendAction(s)
  return log(s, `${playerLabel(playerId)}이(가) ${CITIES[destination].name} 카드를 버리고 직항기로 이동했습니다.`)
}

/** 전세기: 현재 위치 도시 카드를 버리고 원하는 도시로 이동. */
export function charterFlight(state: GameState, playerId: 'p1' | 'p2', destination: CityId): GameState {
  const p = state.players[playerId]
  if (destination === p.location) return state
  const idx = findCityCardIndex(p.hand, p.location)
  if (idx < 0) return state
  const hand = p.hand.filter((_, i) => i !== idx)
  let s = { ...state, playerDiscard: [...state.playerDiscard, p.hand[idx]] }
  const from = p.location
  s = setPlayer(s, playerId, { location: destination, hand })
  s = spendAction(s)
  return log(s, `${playerLabel(playerId)}이(가) ${CITIES[from].name} 카드를 버리고 전세기로 ${CITIES[destination].name}(으)로 이동했습니다.`)
}

/** 정기 항공편: 연구소가 있는 도시끼리 카드 없이 이동. */
export function shuttleFlight(state: GameState, playerId: 'p1' | 'p2', destination: CityId): GameState {
  const p = state.players[playerId]
  if (destination === p.location) return state
  if (!state.stations.includes(p.location) || !state.stations.includes(destination)) return state
  let s = setPlayer(state, playerId, { location: destination })
  s = spendAction(s)
  return log(s, `${playerLabel(playerId)}이(가) 정기 항공편으로 ${CITIES[p.location].name}에서 ${CITIES[destination].name}(으)로 이동했습니다.`)
}

/** 운영 전문가 전용: 연구소에 있을 때 턴마다 1회, 카드 1장을 버리고 아무
 * 도시로나 이동한다. */
export function operationsShuttle(state: GameState, playerId: 'p1' | 'p2', destination: CityId, discardCity: CityId): GameState {
  const p = state.players[playerId]
  if (p.job !== 'operationsExpert') return state
  if (!state.stations.includes(p.location)) return state
  if (state.usedOperationsShuttle[playerId]) return state
  const idx = findCityCardIndex(p.hand, discardCity)
  if (idx < 0) return state
  const hand = p.hand.filter((_, i) => i !== idx)
  let s = { ...state, playerDiscard: [...state.playerDiscard, p.hand[idx]] }
  s = setPlayer(s, playerId, { location: destination, hand })
  s = { ...s, usedOperationsShuttle: { ...s.usedOperationsShuttle, [playerId]: true } }
  s = spendAction(s)
  return log(s, `${playerLabel(playerId)}이(가) 운영 전문가 능력으로 ${CITIES[discardCity].name} 카드를 버리고 ${CITIES[destination].name}(으)로 이동했습니다.`)
}

/** 연구소 건설. 이미 6개면 relocateFrom으로 지정한 기존 연구소를 옮긴다. */
export function buildStation(state: GameState, playerId: 'p1' | 'p2', relocateFrom?: CityId): GameState {
  const p = state.players[playerId]
  if (state.stations.includes(p.location)) return state

  let hand = p.hand
  let discard = state.playerDiscard
  if (p.job !== 'operationsExpert') {
    const idx = findCityCardIndex(hand, p.location)
    if (idx < 0) return state
    discard = [...discard, hand[idx]]
    hand = hand.filter((_, i) => i !== idx)
  }

  let stations = state.stations
  if (stations.length >= 6) {
    if (!relocateFrom || !stations.includes(relocateFrom)) return state
    stations = stations.filter((c) => c !== relocateFrom)
  }
  stations = [...stations, p.location]

  let s: GameState = { ...state, stations, playerDiscard: discard }
  s = setPlayer(s, playerId, { hand })
  s = spendAction(s)
  return log(s, `${playerLabel(playerId)}이(가) ${CITIES[p.location].name}에 연구소를 건설했습니다.`)
}

/** 질병 치료. 위생병은 해당 색 큐브를 전부 제거하고, 치료제가 개발된
 * 질병은 누구든 한 번에 전부 제거한다. */
export function treatDisease(state: GameState, playerId: 'p1' | 'p2', color: DiseaseColor): GameState {
  const p = state.players[playerId]
  const current = state.cubes[p.location]?.[color] ?? 0
  if (current <= 0) return state

  const removeAll = p.job === 'medic' || state.cured[color]
  const removed = removeAll ? current : 1
  const cubes = { ...state.cubes, [p.location]: { ...state.cubes[p.location], [color]: current - removed } }
  const cubeSupply = { ...state.cubeSupply, [color]: state.cubeSupply[color] + removed }

  let s: GameState = { ...state, cubes, cubeSupply }
  s = checkEradication(s, color)
  s = spendAction(s)
  return log(s, `${playerLabel(playerId)}이(가) ${CITIES[p.location].name}의 큐브를 치료했습니다 (${colorName(color)} -${removed}).`)
}

export function checkEradication(state: GameState, color: DiseaseColor): GameState {
  if (!state.cured[color] || state.eradicated[color]) return state
  let total = 0
  for (const byColor of Object.values(state.cubes)) total += byColor[color] ?? 0
  if (total > 0) return state
  const s = { ...state, eradicated: { ...state.eradicated, [color]: true } }
  return log(s, `${colorName(color)} 질병이 근절되었습니다!`, 'system')
}

/** 치료제 개발. 연구소가 있는 도시에서, 같은 색 도시 카드 N장을 버린다. */
export function discoverCure(state: GameState, playerId: 'p1' | 'p2', color: DiseaseColor): GameState {
  const p = state.players[playerId]
  if (!state.stations.includes(p.location)) return state
  if (state.cured[color]) return state
  const needed = cureCardsRequired(p.job)
  const matching = p.hand.filter((c) => isCityCard(c) && CITIES[c.city].color === color)
  if (matching.length < needed) return state

  const toDiscard = matching.slice(0, needed)
  const discardSet = new Set(toDiscard)
  const hand = p.hand.filter((c) => !discardSet.has(c))

  let s: GameState = { ...state, playerDiscard: [...state.playerDiscard, ...toDiscard], cured: { ...state.cured, [color]: true } }
  s = setPlayer(s, playerId, { hand })
  s = checkEradication(s, color)
  s = spendAction(s)
  s = log(s, `${playerLabel(playerId)}이(가) ${colorName(color)} 치료제를 개발했습니다!`, 'system')
  if (Object.values(s.cured).every(Boolean)) {
    s = { ...s, result: 'win' }
    s = log(s, '🎉 인류가 질병을 극복했습니다! 4개의 치료제가 모두 개발되었습니다.', 'win')
  }
  return s
}

/** 정보 공유. 두 플레이어가 같은 도시에 있어야 한다. giver가 receiver에게
 * 카드를 준다. 연구원은 아무 도시 카드나 줄 수 있다 (그 외에는 현재 위치
 * 도시 카드만 가능). */
export function shareKnowledge(state: GameState, giverId: 'p1' | 'p2', receiverId: 'p1' | 'p2', city: CityId): GameState {
  if (giverId === receiverId) return state
  const giver = state.players[giverId]
  const receiver = state.players[receiverId]
  if (giver.location !== receiver.location) return state

  const isResearcherGiving = giver.job === 'researcher'
  const idx = isResearcherGiving ? findCityCardIndex(giver.hand, city) : giver.location === city ? findCityCardIndex(giver.hand, city) : -1
  if (idx < 0) return state
  const card = giver.hand[idx]

  let s: GameState = { ...state }
  s = setPlayer(s, giverId, { hand: giver.hand.filter((_, i) => i !== idx) })
  s = setPlayer(s, receiverId, { hand: [...state.players[receiverId].hand, card] })
  s = spendAction(s)
  s = checkHandLimit(s, receiverId)
  return log(s, `${playerLabel(giverId)}이(가) ${playerLabel(receiverId)}에게 ${CITIES[city].name} 카드를 주었습니다.`)
}

export function pass(state: GameState, playerId: 'p1' | 'p2'): GameState {
  const s = spendAction(state)
  return log(s, `${playerLabel(playerId)}이(가) 행동을 넘겼습니다.`)
}

/** 운항 관리자: 다른 플레이어의 말을 그 플레이어의 규칙대로 대신 이동시킨다. */
export function dispatcherMove(
  state: GameState,
  dispatcherId: 'p1' | 'p2',
  targetPlayer: 'p1' | 'p2',
  moveKind: NonNullable<ActionParams['moveKind']>,
  destination: CityId,
): GameState {
  const dispatcher = state.players[dispatcherId]
  if (dispatcher.job !== 'dispatcher') return state
  const target = state.players[targetPlayer]

  let ok = false
  switch (moveKind) {
    case 'drive':
      ok = isAdjacent(target.location, destination)
      break
    case 'directFlight':
      ok = findCityCardIndex(target.hand, destination) >= 0
      break
    case 'charterFlight':
      ok = findCityCardIndex(target.hand, target.location) >= 0
      break
    case 'shuttleFlight':
      ok = state.stations.includes(target.location) && state.stations.includes(destination)
      break
  }
  if (!ok || destination === target.location) return state

  let hand = target.hand
  let discard = state.playerDiscard
  if (moveKind === 'directFlight') {
    const idx = findCityCardIndex(hand, destination)
    discard = [...discard, hand[idx]]
    hand = hand.filter((_, i) => i !== idx)
  } else if (moveKind === 'charterFlight') {
    const idx = findCityCardIndex(hand, target.location)
    discard = [...discard, hand[idx]]
    hand = hand.filter((_, i) => i !== idx)
  }

  let s: GameState = { ...state, playerDiscard: discard }
  const from = target.location
  s = setPlayer(s, targetPlayer, { location: destination, hand })
  s = spendAction(s)
  return log(s, `${playerLabel(dispatcherId)}의 지시로 ${playerLabel(targetPlayer)}이(가) ${CITIES[from].name}에서 ${CITIES[destination].name}(으)로 이동했습니다.`)
}

/** 운항 관리자: 아무 말이나(자신 포함) 다른 플레이어가 있는 도시로 즉시
 * 이동시킨다. 카드 소모 없음. */
export function dispatcherRendezvous(state: GameState, dispatcherId: 'p1' | 'p2', moveWho: 'p1' | 'p2'): GameState {
  const dispatcher = state.players[dispatcherId]
  if (dispatcher.job !== 'dispatcher') return state
  const other = otherPlayerId(moveWho)
  const destination = state.players[other].location
  if (state.players[moveWho].location === destination) return state
  let s = setPlayer(state, moveWho, { location: destination })
  s = spendAction(s)
  return log(s, `${playerLabel(dispatcherId)}의 지시로 ${playerLabel(moveWho)}이(가) ${CITIES[destination].name}(으)로 합류했습니다.`)
}

/** 대책 전문가: 버림 더미에서 이벤트 카드 1장을 손패처럼 확보해 둔다. */
export function contingencyStash(state: GameState, playerId: 'p1' | 'p2', eventFromDiscard: NonNullable<ActionParams['eventFromDiscard']>): GameState {
  const p = state.players[playerId]
  if (p.job !== 'contingencyPlanner') return state
  if (p.contingencyCard) return state
  const idx = state.playerDiscard.findIndex((c) => c.kind === 'event' && c.event === eventFromDiscard)
  if (idx < 0) return state
  const playerDiscard = state.playerDiscard.filter((_, i) => i !== idx)
  let s: GameState = { ...state, playerDiscard }
  s = setPlayer(s, playerId, { contingencyCard: eventFromDiscard })
  s = spendAction(s)
  return log(s, `${playerLabel(playerId)}이(가) 버림 더미에서 이벤트 카드를 확보했습니다.`)
}

export function playerLabel(id: 'p1' | 'p2'): string {
  return id === 'p1' ? '플레이어 1' : '플레이어 2'
}
