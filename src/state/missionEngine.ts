import { CHARACTERS } from '../data/characters'

// 표준 아발론 10인 규칙: 조사 인원 3-4-4-5-5, 4 차만 실패 카드 2 장 이상이어야 실패.
// 도중에 먼저 3 승을 거둬도 조사를 멈추지 않고 5 차까지 전부 진행하며,
// 최종 승패는 5 차가 끝난 뒤 승수가 더 많은 진영으로 결정한다.
export const MISSION_SIZES = [3, 4, 4, 5, 5]
export const TWO_FAILS_REQUIRED = [false, false, false, true, false]
export const MAX_REJECTIONS = 5

// 조사대 구성 / 찬반 투표 / 성공-실패 제출, 세 단계 모두 참여자 10 인이 각자 직접
// 응답해야 한다. 각 단계는 10 분 동안 진행되며, 불가가 표결·제출을 마감하면 실제로
// 걷힌 응답만으로 결과가 확정된다.
export const MISSION_PHASE_MS = 10 * 60 * 1000

export type MissionPhase = 'propose' | 'vote' | 'execute' | 'result' | 'gameover'
export type MissionOutcome = 'success' | 'fail' | null

export interface MissionState {
  turnOrder: string[]
  missionIndex: number
  leaderIdx: number
  phase: MissionPhase
  proposedTeam: string[]
  rejectionCount: number
  voteTally: { approve: number; reject: number } | null
  cardTally: { success: number; fail: number } | null
  missionResults: MissionOutcome[]
  failCounts: (number | null)[]
  teamHistory: (string[] | null)[]
  wardWins: number
  sinWins: number
  winner: 'ward' | 'sin' | null
  lastNote: string
  shielded: boolean
  phaseStartedAtMs: number | null
  votes: Record<string, boolean>
  cards: Record<string, 'success' | 'fail'>
}

export type MissionAction =
  | { type: 'CONFIRM_PROPOSAL'; team: string[]; leaderName: string }
  | { type: 'CAST_VOTE'; viewerId: string; approve: boolean }
  | { type: 'CLOSE_VOTE' }
  | { type: 'SUBMIT_CARD'; viewerId: string; card: 'success' | 'fail' }
  | { type: 'CLOSE_EXECUTE' }
  | { type: 'CONTINUE' }
  | { type: 'RESET' }
  | { type: 'FORGE_RESULT' }

const DEFAULT_ORDER = CHARACTERS.map((c) => c.id)

// 망각자는 3 차 조사 결과가 확정되는 순간, 본인이 참가했던 1~3 차 조사 중
// 실패로 끝난 조사가 2 회 이상이면 '괴이'로, 아니면 '학생'으로 진영이 확정된다.
// 확정 전까지는 어느 쪽도 아닌 veil 로 취급한다.
export function resolvedTeam(state: MissionState, viewerId: string): 'ward' | 'sin' | 'veil' {
  const char = CHARACTERS.find((c) => c.id === viewerId)!
  if (char.role !== '망각자') return char.team
  if (state.missionResults[2] === null) return 'veil'
  let fails = 0
  for (let i = 0; i < 3; i++) {
    const team = state.teamHistory[i]
    if (team && team.includes(viewerId) && state.missionResults[i] === 'fail') fails++
  }
  return fails >= 2 ? 'sin' : 'ward'
}

export function initialMissionState(turnOrder: string[] = DEFAULT_ORDER): MissionState {
  return {
    turnOrder,
    missionIndex: 0,
    leaderIdx: 0,
    phase: 'propose',
    proposedTeam: [],
    rejectionCount: 0,
    voteTally: null,
    cardTally: null,
    missionResults: MISSION_SIZES.map(() => null),
    failCounts: MISSION_SIZES.map(() => null),
    teamHistory: MISSION_SIZES.map(() => null),
    wardWins: 0,
    sinWins: 0,
    winner: null,
    lastNote: '',
    shielded: false,
    phaseStartedAtMs: Date.now(),
    votes: {},
    cards: {},
  }
}

export function missionReducer(state: MissionState, action: MissionAction): MissionState {
  switch (action.type) {
    case 'CONFIRM_PROPOSAL': {
      if (state.phase !== 'propose') return state
      return {
        ...state,
        proposedTeam: action.team,
        phase: 'vote',
        voteTally: null,
        votes: {},
        phaseStartedAtMs: Date.now(),
        lastNote: `${action.leaderName}이(가) 조사대를 제안했다.`,
      }
    }

    case 'CAST_VOTE': {
      if (state.phase !== 'vote') return state
      if (state.votes[action.viewerId] !== undefined) return state
      return { ...state, votes: { ...state.votes, [action.viewerId]: action.approve } }
    }

    case 'CLOSE_VOTE': {
      if (state.phase !== 'vote') return state
      let approve = 0
      let reject = 0
      for (const v of Object.values(state.votes)) {
        if (v) approve++
        else reject++
      }
      const tally = { approve, reject }
      const approved = tally.approve > tally.reject
      if (approved) {
        return {
          ...state,
          voteTally: tally,
          phase: 'execute',
          rejectionCount: 0,
          cards: {},
          phaseStartedAtMs: Date.now(),
          lastNote: `찬성 ${tally.approve} · 반대 ${tally.reject} — 조사대가 승인되었다.`,
        }
      }
      const nextRejections = state.rejectionCount + 1
      if (nextRejections >= MAX_REJECTIONS) {
        const results = [...state.missionResults]
        results[state.missionIndex] = 'fail'
        const failCounts = [...state.failCounts]
        failCounts[state.missionIndex] = 0
        const teamHistory = [...state.teamHistory]
        teamHistory[state.missionIndex] = state.proposedTeam
        return {
          ...state,
          voteTally: tally,
          missionResults: results,
          failCounts,
          teamHistory,
          sinWins: state.sinWins + 1,
          phase: 'result',
          lastNote: `찬성 ${tally.approve} · 반대 ${tally.reject} — 5 회 연속 부결로 조사가 자동 실패했다.`,
        }
      }
      const nextLeaderIdx = (state.leaderIdx + 1) % state.turnOrder.length
      return {
        ...state,
        voteTally: tally,
        rejectionCount: nextRejections,
        leaderIdx: nextLeaderIdx,
        phase: 'propose',
        proposedTeam: [],
        votes: {},
        phaseStartedAtMs: Date.now(),
        lastNote: `찬성 ${tally.approve} · 반대 ${tally.reject} — 부결되었다. (${nextRejections}/${MAX_REJECTIONS})`,
      }
    }

    case 'SUBMIT_CARD': {
      if (state.phase !== 'execute') return state
      if (!state.proposedTeam.includes(action.viewerId)) return state
      if (state.cards[action.viewerId] !== undefined) return state
      if (action.card === 'fail' && resolvedTeam(state, action.viewerId) !== 'sin') return state
      return { ...state, cards: { ...state.cards, [action.viewerId]: action.card } }
    }

    case 'CLOSE_EXECUTE': {
      if (state.phase !== 'execute') return state
      const required = TWO_FAILS_REQUIRED[state.missionIndex] ? 2 : 1
      let success = 0
      let rawFail = 0
      for (const id of state.proposedTeam) {
        const card = state.cards[id] ?? 'success'
        if (card === 'fail') rawFail++
        else success++
      }
      const shieldedNow = state.shielded && rawFail > 0
      const fail = shieldedNow ? rawFail - 1 : rawFail
      const result: MissionOutcome = fail >= required ? 'fail' : 'success'
      const results = [...state.missionResults]
      results[state.missionIndex] = result
      const failCounts = [...state.failCounts]
      failCounts[state.missionIndex] = fail
      const teamHistory = [...state.teamHistory]
      teamHistory[state.missionIndex] = state.proposedTeam
      const wardWins = state.wardWins + (result === 'success' ? 1 : 0)
      const sinWins = state.sinWins + (result === 'fail' ? 1 : 0)
      return {
        ...state,
        cardTally: { success, fail },
        missionResults: results,
        failCounts,
        teamHistory,
        wardWins,
        sinWins,
        shielded: false,
        phase: 'result',
        lastNote:
          result === 'success'
            ? `성공 ${success} · 실패 ${fail} — 조사 성공.${shieldedNow ? ' (누군가 이 조사를 지켜냈다.......)' : ''}`
            : `성공 ${success} · 실패 ${fail} — 조사 실패.${shieldedNow ? ' (지켜내려 했지만 막지 못했다.......)' : ''}`,
      }
    }

    case 'FORGE_RESULT': {
      if (state.missionResults[state.missionIndex] !== 'success') return state
      const results = [...state.missionResults]
      results[state.missionIndex] = 'fail'
      return {
        ...state,
        missionResults: results,
        wardWins: state.wardWins - 1,
        sinWins: state.sinWins + 1,
        lastNote: `${state.lastNote} — 누군가 결과를 조작했다. 조사 실패로 뒤바뀌었다.`,
      }
    }

    case 'CONTINUE': {
      const isFinalMission = state.missionIndex >= MISSION_SIZES.length - 1
      if (isFinalMission) {
        const winner = state.wardWins > state.sinWins ? 'ward' : 'sin'
        return { ...state, phase: 'gameover', winner }
      }
      const nextLeaderIdx = (state.leaderIdx + 1) % state.turnOrder.length
      return {
        ...state,
        missionIndex: state.missionIndex + 1,
        leaderIdx: nextLeaderIdx,
        phase: 'propose',
        proposedTeam: [],
        rejectionCount: 0,
        voteTally: null,
        cardTally: null,
        votes: {},
        cards: {},
        phaseStartedAtMs: Date.now(),
      }
    }

    case 'RESET':
      return initialMissionState(state.turnOrder)

    default:
      return state
  }
}
