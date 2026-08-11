import { CHARACTERS } from '../data/characters'

// 표준 아발론 10인 규칙: 원정 인원 3-4-4-5-5, 4차만 실패 카드 2장 이상이어야 실패.
// 먼저 3승을 거두는 진영이 승리하므로, 4차까지 2:2일 때만 5차(최종) 원정까지 간다.
export const MISSION_SIZES = [3, 4, 4, 5, 5]
export const TWO_FAILS_REQUIRED = [false, false, false, true, false]
export const WINS_NEEDED = 3
export const MAX_REJECTIONS = 5

export type MissionPhase = 'propose' | 'vote' | 'execute' | 'result' | 'gameover'
export type MissionOutcome = 'success' | 'fail' | null

export interface MissionState {
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
}

export type MissionAction =
  | { type: 'AUTO_FILL_IF_NPC' }
  | { type: 'CONFIRM_PROPOSAL'; team: string[] }
  | { type: 'CAST_VOTE'; viewerId: string; approve: boolean }
  | { type: 'SUBMIT_CARD'; viewerId: string; card: 'success' | 'fail' | null }
  | { type: 'CONTINUE' }
  | { type: 'RESET' }
  | { type: 'FORGE_RESULT' }

const ALL_IDS = CHARACTERS.map((c) => c.id)

function charTeam(id: string) {
  return CHARACTERS.find((c) => c.id === id)!.team
}

function pickAutoTeam(leaderId: string, size: number): string[] {
  const rest = ALL_IDS.filter((id) => id !== leaderId)
  const shuffled = [...rest].sort(() => Math.random() - 0.5)
  return [leaderId, ...shuffled.slice(0, size - 1)]
}

export function initialMissionState(): MissionState {
  const state: MissionState = {
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
  }
  return autoFillIfNpc(state)
}

function autoFillIfNpc(state: MissionState): MissionState {
  const leaderId = ALL_IDS[state.leaderIdx]
  const leader = CHARACTERS.find((c) => c.id === leaderId)!
  if (state.phase !== 'propose') return state
  return {
    ...state,
    proposedTeam: pickAutoTeam(leaderId, MISSION_SIZES[state.missionIndex]),
    lastNote: `${leader.name}이(가) 원정대를 제안했다.`,
  }
}

function simulateVotes(
  viewerId: string,
  viewerApprove: boolean,
): { approve: number; reject: number } {
  let approve = 0
  let reject = 0
  for (const c of CHARACTERS) {
    let vote: boolean
    if (c.id === viewerId) {
      vote = viewerApprove
    } else if (c.team === 'sin') {
      vote = Math.random() < 0.5
    } else if (c.team === 'veil') {
      vote = Math.random() < 0.7
    } else {
      vote = Math.random() < 0.78
    }
    if (vote) approve++
    else reject++
  }
  return { approve, reject }
}

function simulateCards(
  team: string[],
  viewerId: string,
  viewerCard: 'success' | 'fail' | null,
  required: number,
): { success: number; fail: number; result: MissionOutcome } {
  let success = 0
  let fail = 0
  for (const id of team) {
    let card: 'success' | 'fail'
    if (id === viewerId && viewerCard) {
      card = viewerCard
    } else if (charTeam(id) === 'sin') {
      card = Math.random() < 0.65 ? 'fail' : 'success'
    } else {
      card = 'success'
    }
    if (card === 'fail') fail++
    else success++
  }
  return { success, fail, result: fail >= required ? 'fail' : 'success' }
}

export function missionReducer(state: MissionState, action: MissionAction): MissionState {
  switch (action.type) {
    case 'AUTO_FILL_IF_NPC':
      return autoFillIfNpc(state)

    case 'CONFIRM_PROPOSAL':
      return { ...state, proposedTeam: action.team, phase: 'vote', voteTally: null }

    case 'CAST_VOTE': {
      const tally = simulateVotes(action.viewerId, action.approve)
      const approved = tally.approve > tally.reject
      if (approved) {
        return {
          ...state,
          voteTally: tally,
          phase: 'execute',
          rejectionCount: 0,
          lastNote: `찬성 ${tally.approve} · 반대 ${tally.reject} — 원정대가 승인되었다.`,
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
          lastNote: `찬성 ${tally.approve} · 반대 ${tally.reject} — 5 회 연속 부결로 원정이 자동 실패했다.`,
        }
      }
      const nextLeaderIdx = (state.leaderIdx + 1) % ALL_IDS.length
      return autoFillIfNpc({
        ...state,
        voteTally: tally,
        rejectionCount: nextRejections,
        leaderIdx: nextLeaderIdx,
        phase: 'propose',
        lastNote: `찬성 ${tally.approve} · 반대 ${tally.reject} — 부결되었다. (${nextRejections}/${MAX_REJECTIONS})`,
      })
    }

    case 'SUBMIT_CARD': {
      const required = TWO_FAILS_REQUIRED[state.missionIndex] ? 2 : 1
      const { success, fail, result } = simulateCards(
        state.proposedTeam,
        action.viewerId,
        action.card,
        required,
      )
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
        phase: 'result',
        lastNote:
          result === 'success'
            ? `성공 ${success} · 실패 ${fail} — 원정 성공.`
            : `성공 ${success} · 실패 ${fail} — 원정 실패.`,
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
        lastNote: `${state.lastNote} — 누군가 결과를 조작했다. 원정 실패로 뒤바뀌었다.`,
      }
    }

    case 'CONTINUE': {
      if (state.wardWins >= WINS_NEEDED) {
        return { ...state, phase: 'gameover', winner: 'ward' }
      }
      if (state.sinWins >= WINS_NEEDED) {
        return { ...state, phase: 'gameover', winner: 'sin' }
      }
      const nextLeaderIdx = (state.leaderIdx + 1) % ALL_IDS.length
      return autoFillIfNpc({
        ...state,
        missionIndex: state.missionIndex + 1,
        leaderIdx: nextLeaderIdx,
        phase: 'propose',
        proposedTeam: [],
        rejectionCount: 0,
        voteTally: null,
        cardTally: null,
      })
    }

    case 'RESET':
      return initialMissionState()

    default:
      return state
  }
}
