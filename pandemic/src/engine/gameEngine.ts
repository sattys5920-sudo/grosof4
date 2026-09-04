// 게임 초기 세팅과 턴 진행(행동 4회 -> 카드 2장(전염 카드는 즉시 처리) ->
// 손패 제한 -> 도시 감염 -> 턴 종료)을 담당한다. 개별 행동은 actions.ts,
// 감염/확산은 infection.ts에 있다.
import { CITIES, START_CITY } from './map'
import { JOB_IDS } from './jobs'
import { buildDecks } from './deck'
import { Rng, freshSeed } from './rng'
import { cityInfectionStep, resolveEpidemic } from './infection'
import { otherPlayerId, playerLabel } from './actions'
import { EVENT_INFO } from './eventCards'
import type { Difficulty, GameState, JobId, PlayerCard, PlayerState } from './types'

const INITIAL_CUBES_PER_COLOR = 24
export const STATIONS_MAX = 6

export function createInitialState(difficulty: Difficulty = 'normal'): GameState {
  const seed = freshSeed()
  const rng = new Rng(seed)

  const jobs = rng.shuffle(JOB_IDS)
  const [job1, job2] = jobs as [JobId, JobId]

  const { hands, playerDeck, infectionDeck } = buildDecks(rng, difficulty)

  const p1: PlayerState = { id: 'p1', job: job1, location: START_CITY, hand: hands[0], contingencyCard: null }
  const p2: PlayerState = { id: 'p2', job: job2, location: START_CITY, hand: hands[1], contingencyCard: null }

  let state: GameState = {
    difficulty,
    turn: 1,
    currentPlayer: 'p1',
    actionsLeft: 4,
    phase: 'setup',
    players: { p1, p2 },
    cubes: {},
    cubeSupply: { blue: INITIAL_CUBES_PER_COLOR, yellow: INITIAL_CUBES_PER_COLOR, black: INITIAL_CUBES_PER_COLOR, red: INITIAL_CUBES_PER_COLOR },
    stations: [START_CITY],
    cured: { blue: false, yellow: false, black: false, red: false },
    eradicated: { blue: false, yellow: false, black: false, red: false },
    outbreakCount: 0,
    infectionRateIndex: 0,
    playerDeck,
    playerDiscard: [],
    infectionDeck,
    infectionDiscard: [],
    pendingDiscards: [],
    usedOperationsShuttle: { p1: false, p2: false },
    skipNextInfection: false,
    log: [
      { turn: 0, text: `플레이어 1: ${jobName(job1)}, 플레이어 2: ${jobName(job2)} — 애틀랜타에서 시작합니다.`, tag: 'system' },
    ],
    result: null,
    loseReason: null,
    rngState: rng.state,
  }

  // 초기 감염: 감염 카드 9장 (3장씩 3/2/1개)
  const waves: Array<[number, number]> = [
    [3, 3],
    [3, 2],
    [3, 1],
  ]
  for (const [count, amount] of waves) {
    for (let i = 0; i < count; i++) {
      const city = state.infectionDeck[0]
      const rest = state.infectionDeck.slice(1)
      const color = CITIES[city].color
      const cubes = { ...state.cubes, [city]: { ...state.cubes[city], [color]: (state.cubes[city]?.[color] ?? 0) + amount } }
      const cubeSupply = { ...state.cubeSupply, [color]: state.cubeSupply[color] - amount }
      state = {
        ...state,
        infectionDeck: rest,
        infectionDiscard: [...state.infectionDiscard, city],
        cubes,
        cubeSupply,
      }
    }
  }

  state = { ...state, phase: 'actions', rngState: rng.state }
  return state
}

function jobName(job: JobId): string {
  switch (job) {
    case 'dispatcher':
      return '운항 관리자'
    case 'operationsExpert':
      return '운영 전문가'
    case 'scientist':
      return '과학자'
    case 'medic':
      return '위생병'
    case 'researcher':
      return '연구원'
    case 'quarantineSpecialist':
      return '검역관'
    case 'contingencyPlanner':
      return '대책 전문가'
  }
}

function log(state: GameState, text: string, tag: GameState['log'][number]['tag'] = 'system'): GameState {
  return { ...state, log: [{ turn: state.turn, text, tag }, ...state.log] }
}

/** 행동을 다 썼으면(혹은 플레이어가 넘기면) 카드 2장 뽑기로 넘어간다. */
export function endActionsIfDone(state: GameState): GameState {
  if (state.result) return state
  if (state.actionsLeft > 0) return state
  return drawPhase({ ...state, phase: 'drawCards' })
}

/** 카드 2장을 뽑는다. 전염 카드는 즉시 처리하고 버림 더미로, 도시/이벤트
 * 카드는 손패로 들어간다. 플레이어 덱이 모자라면 즉시 패배. */
function drawPhase(state: GameState): GameState {
  const rng = new Rng(state.rngState)
  let s = state
  for (let i = 0; i < 2; i++) {
    if (s.result) break
    if (s.playerDeck.length === 0) {
      s = { ...s, result: 'lose', loseReason: '플레이어 카드 덱이 소진되었습니다.' }
      s = log(s, '☠️ 플레이어 카드 덱이 소진되었습니다.', 'lose')
      break
    }
    const [card, ...rest] = s.playerDeck
    s = { ...s, playerDeck: rest }
    s = drawOneCard(s, card, rng)
  }
  if (s.result) return { ...s, phase: 'ended', rngState: rng.state }

  if (s.pendingDiscards.length > 0) {
    return { ...s, phase: 'discard', rngState: rng.state }
  }
  return infectPhase({ ...s, phase: 'infect', rngState: rng.state })
}

function drawOneCard(state: GameState, card: PlayerCard, rng: Rng): GameState {
  const pid = state.currentPlayer
  if (card.kind === 'epidemic') {
    let s = { ...state, playerDiscard: [...state.playerDiscard, card] }
    s = resolveEpidemic(s, rng)
    return s
  }
  const p = state.players[pid]
  let s: GameState = { ...state, players: { ...state.players, [pid]: { ...p, hand: [...p.hand, card] } } }
  const label = card.kind === 'city' ? CITIES[card.city].name + ' 카드' : EVENT_INFO[card.event].name
  s = log(s, `${playerLabel(pid)}이(가) ${label}를 뽑았습니다.`, 'action')
  if (s.players[pid].hand.length > 7 && !s.pendingDiscards.includes(pid)) {
    s = { ...s, pendingDiscards: [...s.pendingDiscards, pid] }
  }
  return s
}

/** 손패 제한 처리 중 카드를 하나 버린다. 대기열의 해당 플레이어 손패가
 * 7장 이하가 되면 다음 대기 플레이어로 넘어가거나 감염 단계로 진행한다. */
export function discardCard(state: GameState, playerId: 'p1' | 'p2', cardIndex: number): GameState {
  if (state.phase !== 'discard') return state
  if (state.pendingDiscards[0] !== playerId) return state
  const p = state.players[playerId]
  if (cardIndex < 0 || cardIndex >= p.hand.length) return state
  const card = p.hand[cardIndex]
  const hand = p.hand.filter((_, i) => i !== cardIndex)
  let s: GameState = { ...state, playerDiscard: [...state.playerDiscard, card] }
  s = { ...s, players: { ...s.players, [playerId]: { ...p, hand } } }
  if (hand.length <= 7) {
    s = { ...s, pendingDiscards: s.pendingDiscards.slice(1) }
  }
  if (s.pendingDiscards.length > 0) return s
  return infectPhase({ ...s, phase: 'infect' })
}

function infectPhase(state: GameState): GameState {
  let s = state
  if (s.skipNextInfection) {
    s = log(s, '평온한 하룻밤 — 이번 도시 감염 단계를 건너뜁니다.', 'system')
    s = { ...s, skipNextInfection: false }
  } else {
    s = cityInfectionStep(s)
  }
  if (s.result) return { ...s, phase: 'ended' }
  return endTurn(s)
}

function endTurn(state: GameState): GameState {
  const next = otherPlayerId(state.currentPlayer)
  return {
    ...state,
    currentPlayer: next,
    actionsLeft: 4,
    phase: 'actions',
    turn: state.turn + 1,
    usedOperationsShuttle: { ...state.usedOperationsShuttle, [next]: false },
  }
}

export function isGameOver(state: GameState): boolean {
  return state.result !== null
}
