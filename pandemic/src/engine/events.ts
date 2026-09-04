// 이벤트 카드 5종. 실제 규칙대로 행동 횟수를 소모하지 않고 언제든 쓸 수
// 있다. 대책 전문가가 확보해 둔 카드로 쓰면 버림 더미가 아니라 게임에서
// 완전히 제거된다.
import { CITIES } from './map'
import { STATIONS_MAX } from './gameEngine'
import type { CityId, EventId, GameState, PlayerState } from './types'

function setPlayer(state: GameState, id: 'p1' | 'p2', patch: Partial<PlayerState>): GameState {
  return { ...state, players: { ...state.players, [id]: { ...state.players[id], ...patch } } }
}

function log(state: GameState, text: string): GameState {
  return { ...state, log: [{ turn: state.turn, text, tag: 'action' }, ...state.log] }
}

/** 이벤트 카드를 손에서(또는 대책 전문가의 보관 카드에서) 소모한다.
 * 손패에서 냈으면 버림 더미로, 보관 카드였으면 게임에서 완전히 제거된다.
 * 카드가 없으면 null. */
function consumeEventCard(state: GameState, playerId: 'p1' | 'p2', event: EventId): GameState | null {
  const p = state.players[playerId]
  const idx = p.hand.findIndex((c) => c.kind === 'event' && c.event === event)
  if (idx >= 0) {
    const card = p.hand[idx]
    const hand = p.hand.filter((_, i) => i !== idx)
    let s = setPlayer(state, playerId, { hand })
    s = { ...s, playerDiscard: [...s.playerDiscard, card] }
    return s
  }
  if (p.contingencyCard === event) {
    return setPlayer(state, playerId, { contingencyCard: null })
  }
  return null
}

/** 긴급 공중 수송: 아무 말이나 원하는 도시로 즉시 이동시킨다. */
export function playAirlift(state: GameState, playerId: 'p1' | 'p2', targetPlayer: 'p1' | 'p2', destination: CityId): GameState {
  const s0 = consumeEventCard(state, playerId, 'airlift')
  if (!s0) return state
  const from = s0.players[targetPlayer].location
  if (from === destination) return state
  let s = setPlayer(s0, targetPlayer, { location: destination })
  return log(s, `긴급 공중 수송: ${CITIES[from].name}에서 ${CITIES[destination].name}(으)로 이동했습니다.`)
}

/** 정부 보조금: 원하는 도시에 카드 없이 연구소를 건설한다. */
export function playGovernmentGrant(state: GameState, playerId: 'p1' | 'p2', city: CityId, relocateFrom?: CityId): GameState {
  const s0 = consumeEventCard(state, playerId, 'governmentGrant')
  if (!s0) return state
  if (s0.stations.includes(city)) return state
  let stations = s0.stations
  if (stations.length >= STATIONS_MAX) {
    if (!relocateFrom || !stations.includes(relocateFrom)) return state
    stations = stations.filter((c) => c !== relocateFrom)
  }
  stations = [...stations, city]
  const s = { ...s0, stations }
  return log(s, `정부 보조금: ${CITIES[city].name}에 연구소를 건설했습니다.`)
}

/** 평온한 하룻밤: 다음 도시 감염 단계를 완전히 생략한다. */
export function playOneQuietNight(state: GameState, playerId: 'p1' | 'p2'): GameState {
  const s0 = consumeEventCard(state, playerId, 'oneQuietNight')
  if (!s0) return state
  const s = { ...s0, skipNextInfection: true }
  return log(s, '평온한 하룻밤: 다음 도시 감염 단계를 생략합니다.')
}

/** 예측: 감염 덱 맨 위 6장을 원하는 순서로 재배열한다. newOrder는 그 6장의
 * 순열이어야 한다 (앞이 다음에 뽑힐 카드). */
export function playForecast(state: GameState, playerId: 'p1' | 'p2', newOrder: CityId[]): GameState {
  const s0 = consumeEventCard(state, playerId, 'forecast')
  if (!s0) return state
  const top = s0.infectionDeck.slice(0, 6)
  const rest = s0.infectionDeck.slice(6)
  if (newOrder.length !== top.length) return state
  const topSet = [...top].sort().join(',')
  const orderSet = [...newOrder].sort().join(',')
  if (topSet !== orderSet) return state
  const s = { ...s0, infectionDeck: [...newOrder, ...rest] }
  return log(s, '예측: 감염 덱 위쪽 6장의 순서를 다시 정했습니다.')
}

/** 항체 보유자: 감염 버림 더미에서 카드 1장을 완전히 제거한다. */
export function playResilientPopulation(state: GameState, playerId: 'p1' | 'p2', city: CityId): GameState {
  const s0 = consumeEventCard(state, playerId, 'resilientPopulation')
  if (!s0) return state
  const idx = s0.infectionDiscard.indexOf(city)
  if (idx < 0) return state
  const infectionDiscard = s0.infectionDiscard.filter((_, i) => i !== idx)
  const s = { ...s0, infectionDiscard }
  return log(s, `항체 보유자: ${CITIES[city].name} 감염 카드를 게임에서 제거했습니다.`)
}
