import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from 'react'
import { CHARACTERS, ROOMS } from '../data/characters'
import { INITIAL_FEED } from '../data/feed'
import type {
  Broadcast,
  BroadcastKind,
  ChatMessage,
  ClassroomPuzzle,
  ClassroomState,
  EventLibraryItem,
  FeedPost,
  RoomEventState,
  RoomId,
  RoomPuzzle,
} from '../data/types'
import { initialMissionState, missionReducer, type MissionState } from './missionEngine'

const ADMIN_CODE = '316316316'

export type TabId = 'main' | 'classroom' | 'rooms' | 'mission' | 'profile'

interface GameState {
  viewerId: string | null
  isAdmin: boolean
  setViewerId: (id: string) => void
  nickname: string
  setNickname: (name: string) => void
  grade: string
  photo: string | null
  updatePhoto: (photo: string | null) => void
  signedUp: boolean
  roleRevealed: boolean
  completeSignup: (nickname: string, grade: string, photo: string | null, adminCode: string) => void
  acknowledgeRole: () => void
  displayName: (id: string) => string
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  roomOccupancy: Record<RoomId, string[]>
  joinRoom: (roomId: RoomId) => void
  leaveRoom: (roomId: RoomId) => void
  roomMessages: Record<RoomId, ChatMessage[]>
  sendRoomMessage: (roomId: RoomId, text: string) => void
  roomEvents: Record<RoomId, RoomEventState>
  submitRoomAnswer: (roomId: RoomId, text: string) => void
  dispatchRoomPuzzle: (roomId: RoomId, puzzle: RoomPuzzle) => void
  closeRoomInvestigation: (roomId: RoomId) => void
  classroomMessages: ChatMessage[]
  sendClassroomMessage: (text: string) => void
  classroom: ClassroomState
  dispatchClassroomEvent: (item: EventLibraryItem) => void
  dispatchPuzzle: (puzzle: ClassroomPuzzle) => void
  submitPuzzleAnswer: (text: string) => void
  closeInvestigation: () => void
  attemptDuel: (choice: 'odd' | 'even') => void
  feed: FeedPost[]
  toggleHeart: (postId: string) => void
  gmReveal: boolean
  broadcast: Broadcast | null
  sendBroadcast: (kind: BroadcastKind, title: string, body: string) => void
  dismissBroadcast: () => void
  missionsOpen: boolean
  openMissions: () => void
  mission: MissionState
  confirmProposal: (team: string[]) => void
  castVote: (approve: boolean) => void
  submitCard: (card: 'success' | 'fail' | null) => void
  continueMission: () => void
  resetMission: () => void
  abilityUnlocked: boolean
  abilityUsed: boolean
  personalClues: string[]
  forgottenIdentity: 'ward' | 'sin' | null
  useRecordBook: () => void
  investigate: (targetId: string) => void
  protect: (targetId: string) => void
  protectedId: string | null
  checkCctv: (missionIndex: number) => void
  erode: (targetId: string) => void
  erosionTargetId: string | null
  forgeResult: () => void
  revengerCheck: (targetId: string) => void
  createFeedPost: (title: string, body: string, commentsEnabled: boolean) => void
  toggleCommentsEnabled: (postId: string) => void
  addComment: (postId: string, text: string, secret: boolean) => void
}

const GameContext = createContext<GameState | null>(null)

const INITIAL_OCCUPANCY: Record<RoomId, string[]> = {
  library: ['jimin', 'haneul'],
  infirmary: ['ayoung'],
  broadcast: ['seungwoo', 'gihoon'],
  rooftop: [],
}

const INITIAL_ROOM_MESSAGES: Record<RoomId, ChatMessage[]> = {
  library: [
    { id: 'l1', authorId: 'jimin', text: '졸업앨범부터 뒤져보자, 페이지 순서가 좀 이상해', time: '00:11' },
    { id: 'l2', authorId: 'haneul', text: '......나는 그냥 지켜볼게', time: '00:12' },
  ],
  infirmary: [{ id: 'i1', authorId: 'ayoung', text: '기록부에 그날 오후 진료 사유가 지워져 있어', time: '00:10' }],
  broadcast: [
    { id: 'b1', authorId: 'seungwoo', text: '이 채널, 3 년 전에 폐기된 장비인데 왜 지금 살아있지', time: '00:13' },
    { id: 'b2', authorId: 'gihoon', text: '......나 먼저 나갈게', time: '00:14' },
  ],
  rooftop: [],
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

function initialRoomEvents(): Record<RoomId, RoomEventState> {
  const result = {} as Record<RoomId, RoomEventState>
  for (const room of ROOMS) {
    result[room.id] = { event: null, cleared: false, clue: null, note: null }
  }
  return result
}

function initialClassroom(): ClassroomState {
  return { status: 'locked', event: null, hint: null, note: null }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [grade, setGrade] = useState('1 학년')
  const [photo, setPhoto] = useState<string | null>(null)
  const [signedUp, setSignedUp] = useState(false)
  const [roleRevealed, setRoleRevealed] = useState(false)
  const [claimedSlots, setClaimedSlots] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('main')
  const [roomOccupancy, setRoomOccupancy] = useState(INITIAL_OCCUPANCY)
  const [roomMessages, setRoomMessages] = useState(INITIAL_ROOM_MESSAGES)
  const [roomEvents, setRoomEvents] = useState<Record<RoomId, RoomEventState>>(initialRoomEvents)
  const [classroomMessages, setClassroomMessages] = useState<ChatMessage[]>([])
  const [classroom, setClassroom] = useState<ClassroomState>(initialClassroom)
  const [feed, setFeed] = useState<FeedPost[]>(INITIAL_FEED)
  const [gmReveal, setGmReveal] = useState(false)
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [missionsOpen, setMissionsOpen] = useState(false)
  const [abilityUnlocked, setAbilityUnlocked] = useState(false)
  const [abilityUsed, setAbilityUsed] = useState(false)
  const [personalClues, setPersonalClues] = useState<string[]>([])
  const [protectedId, setProtectedId] = useState<string | null>(null)
  const [erosionTargetId, setErosionTargetId] = useState<string | null>(null)
  const [decoyUsed, setDecoyUsed] = useState(false)
  const [mission, dispatch] = useReducer(missionReducer, undefined, initialMissionState)

  const isAdmin = viewerId === null && signedUp

  function completeSignup(newNickname: string, newGrade: string, newPhoto: string | null, adminCode: string) {
    setGrade(newGrade)
    setPhoto(newPhoto)
    if (adminCode.trim() === ADMIN_CODE) {
      setViewerId(null)
      setNickname(newNickname.trim() || '관리자')
      setGmReveal(true)
      setSignedUp(true)
      setRoleRevealed(true)
      return
    }
    const pool = CHARACTERS.filter((c) => !claimedSlots.includes(c.id))
    const available = pool.length > 0 ? pool : CHARACTERS
    const assigned = available[Math.floor(Math.random() * available.length)]
    setClaimedSlots((prev) => [...prev, assigned.id])
    setViewerId(assigned.id)
    setNickname(newNickname.trim() || assigned.name)
    setGmReveal(false)
    setSignedUp(true)
    setRoleRevealed(false)
  }

  function acknowledgeRole() {
    setRoleRevealed(true)
  }

  function updatePhoto(newPhoto: string | null) {
    setPhoto(newPhoto)
  }

  function openMissions() {
    setMissionsOpen(true)
  }

  function displayName(id: string) {
    if (id === 'admin') return isAdmin ? nickname : '관리자'
    if (id === viewerId) return nickname
    return CHARACTERS.find((c) => c.id === id)?.name ?? '???'
  }

  function currentRoomOf(id: string): RoomId | null {
    for (const room of ROOMS) {
      if (roomOccupancy[room.id].includes(id)) return room.id
    }
    return null
  }

  function joinRoom(roomId: RoomId) {
    if (!viewerId) return
    setRoomOccupancy((prev) => {
      const capacity = ROOMS.find((r) => r.id === roomId)!.capacity
      if (prev[roomId].length >= capacity) return prev
      const existing = currentRoomOf(viewerId)
      const next: Record<RoomId, string[]> = { ...prev }
      if (existing) {
        next[existing] = next[existing].filter((id) => id !== viewerId)
      }
      next[roomId] = [...next[roomId], viewerId]
      return next
    })
  }

  function leaveRoom(roomId: RoomId) {
    if (!viewerId) return
    setRoomOccupancy((prev) => ({
      ...prev,
      [roomId]: prev[roomId].filter((id) => id !== viewerId),
    }))
  }

  function sendRoomMessage(roomId: RoomId, text: string) {
    if (!text.trim() || !viewerId) return
    setRoomMessages((prev) => ({
      ...prev,
      [roomId]: [
        ...prev[roomId],
        { id: `${roomId}-${prev[roomId].length + 1}`, authorId: viewerId, text: text.trim(), time: '지금' },
      ],
    }))
  }

  function sendClassroomMessage(text: string) {
    if (!text.trim() || !viewerId) return
    setClassroomMessages((prev) => [
      ...prev,
      { id: `cr-${prev.length + 1}`, authorId: viewerId, text: text.trim(), time: '지금' },
    ])
  }

  function submitRoomAnswer(roomId: RoomId, text: string) {
    if (!text.trim()) return
    let solved = false
    setRoomEvents((prev) => {
      const state = prev[roomId]
      if (state.cleared || !state.event?.answer) return prev
      const correct = normalize(text) === normalize(state.event.answer)
      if (correct) {
        solved = true
        return { ...prev, [roomId]: { ...state, cleared: true, clue: state.event.reward, note: null } }
      }
      return { ...prev, [roomId]: { ...state, note: '오답이다. 다시 생각해보자.' } }
    })
    if (solved && viewerId && roomOccupancy[roomId].includes(viewerId)) {
      setAbilityUnlocked(true)
    }
  }

  function dispatchRoomPuzzle(roomId: RoomId, puzzle: RoomPuzzle) {
    setRoomEvents((prev) => ({
      ...prev,
      [roomId]: {
        event: {
          title: puzzle.title,
          description: puzzle.brief,
          reward: puzzle.hint,
          kind: 'puzzle',
          category: puzzle.category,
          puzzleText: puzzle.puzzleText,
          answer: puzzle.answer,
        },
        cleared: false,
        clue: null,
        note: null,
      },
    }))
  }

  function closeRoomInvestigation(roomId: RoomId) {
    setRoomEvents((prev) => ({
      ...prev,
      [roomId]: { event: null, cleared: false, clue: null, note: null },
    }))
  }

  function dispatchClassroomEvent(item: EventLibraryItem) {
    if (!item.implemented || item.dispatchKind !== 'duel') return
    setClassroom({
      status: 'active',
      event: {
        title: item.title,
        description: item.description,
        reward: item.reward ?? '',
        kind: 'duel',
      },
      hint: null,
      note: null,
    })
  }

  function dispatchPuzzle(puzzle: ClassroomPuzzle) {
    setClassroom({
      status: 'active',
      event: {
        title: puzzle.title,
        description: puzzle.brief,
        reward: puzzle.hint,
        kind: 'puzzle',
        category: puzzle.category,
        puzzleText: puzzle.puzzleText,
        answer: puzzle.answer,
      },
      hint: null,
      note: null,
    })
    setClassroomMessages([])
  }

  function closeInvestigation() {
    setClassroom(initialClassroom())
  }

  function submitPuzzleAnswer(text: string) {
    if (!text.trim()) return
    setClassroom((prev) => {
      if (prev.status !== 'active' || !prev.event?.answer) return prev
      const correct = normalize(text) === normalize(prev.event.answer)
      if (correct) {
        return { ...prev, status: 'cleared', hint: prev.event.reward, note: null }
      }
      return { ...prev, note: '오답이다. 다시 논의해보자.' }
    })
  }

  function attemptDuel(choice: 'odd' | 'even') {
    setClassroom((prev) => {
      if (prev.status !== 'active' || !prev.event) return prev
      const outcome: 'odd' | 'even' = Math.random() < 0.5 ? 'odd' : 'even'
      const win = outcome === choice
      if (win) {
        return { ...prev, status: 'cleared', hint: prev.event.reward, note: null }
      }
      return { ...prev, note: '괴이가 낮게 웃는다. "아니야." 다시 시도해볼 수 있다.' }
    })
  }

  function toggleHeart(postId: string) {
    setFeed((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              heartedByViewer: !p.heartedByViewer,
              hearts: p.hearts + (p.heartedByViewer ? -1 : 1),
            }
          : p,
      ),
    )
  }

  function addComment(postId: string, text: string, secret: boolean) {
    if (!text.trim() || !signedUp) return
    const authorId = viewerId ?? 'admin'
    setFeed((prev) =>
      prev.map((p) =>
        p.id === postId && p.commentsEnabled
          ? {
              ...p,
              comments: [
                ...p.comments,
                { id: `${postId}-${p.comments.length + 1}`, authorId, text: text.trim(), secret },
              ],
            }
          : p,
      ),
    )
  }

  function toggleCommentsEnabled(postId: string) {
    setFeed((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsEnabled: !p.commentsEnabled } : p)),
    )
  }

  function createFeedPost(title: string, body: string, commentsEnabled: boolean) {
    if (!title.trim() || !body.trim()) return
    setFeed((prev) => [
      {
        id: `post-${Date.now()}`,
        authorLabel: '[관리자]',
        tag: '공지',
        title: title.trim(),
        body: body.trim(),
        time: '방금',
        hearts: 0,
        heartedByViewer: false,
        commentsEnabled,
        comments: [],
      },
      ...prev,
    ])
  }

  const BROADCAST_TAG: Record<BroadcastKind, string> = { event: '이벤트', sin: '괴이', notice: '공지' }
  const BROADCAST_LABEL: Record<BroadcastKind, string> = {
    event: '[긴급 이벤트]',
    sin: '[괴이 출현]',
    notice: '[관리자 쪽지]',
  }

  function sendBroadcast(kind: BroadcastKind, title: string, body: string) {
    if (!title.trim() || !body.trim()) return
    const id = `bc-${Date.now()}`
    setBroadcast({ id, kind, title: title.trim(), body: body.trim() })
    setFeed((prev) => [
      {
        id,
        authorLabel: BROADCAST_LABEL[kind],
        tag: BROADCAST_TAG[kind],
        title: title.trim(),
        body: body.trim(),
        time: '방금',
        hearts: 0,
        heartedByViewer: false,
        commentsEnabled: false,
        comments: [],
      },
      ...prev,
    ])
  }

  function dismissBroadcast() {
    setBroadcast(null)
  }

  function canUseAbility() {
    return abilityUnlocked && !abilityUsed && !!viewerId
  }

  // 잠입자를 대상으로 한 첫 정체 확인은 '선'처럼 위장된다.
  function resolveTeamCheck(targetId: string): 'ward' | 'sin' {
    const target = CHARACTERS.find((c) => c.id === targetId)!
    if (target.role === '잠입자' && !decoyUsed) {
      setDecoyUsed(true)
      return 'ward'
    }
    return target.team === 'ward' ? 'ward' : 'sin'
  }

  function useRecordBook() {
    if (!canUseAbility()) return
    const others = CHARACTERS.filter((c) => c.id !== viewerId)
    const shuffled = [...others].sort(() => Math.random() - 0.5)
    const [a, b] = shuffled.slice(0, 2)
    const lieOnA = Math.random() < 0.5
    const teamLabel = (team: 'ward' | 'sin') => (team === 'ward' ? '선' : '악')
    const trueA = resolveTeamCheck(a.id)
    const trueB = resolveTeamCheck(b.id)
    const shownA = lieOnA ? (trueA === 'ward' ? 'sin' : 'ward') : trueA
    const shownB = !lieOnA ? (trueB === 'ward' ? 'sin' : 'ward') : trueB
    setPersonalClues((prev) => [
      ...prev,
      `《출석부》 ${displayName(a.id)} = ${teamLabel(shownA)}, ${displayName(b.id)} = ${teamLabel(shownB)} — 둘 중 하나는 거짓이다.`,
    ])
    setAbilityUsed(true)
  }

  function investigate(targetId: string) {
    if (!canUseAbility()) return
    let resultText: string
    if (protectedId === targetId) {
      resultText = `《학생부 조사》 ${displayName(targetId)} — 보호받고 있어 판별 불가.`
    } else {
      const team = resolveTeamCheck(targetId)
      resultText = `《학생부 조사》 ${displayName(targetId)} — 실패 카드를 ${team === 'sin' ? '낼 수 있다' : '낼 수 없다'}.`
    }
    setPersonalClues((prev) => [...prev, resultText])
    setAbilityUsed(true)
  }

  function protect(targetId: string) {
    if (!canUseAbility()) return
    setProtectedId(targetId)
    setPersonalClues((prev) => [...prev, `《동행》 ${displayName(targetId)}을(를) 보호하기 시작했다.`])
    setAbilityUsed(true)
  }

  function checkCctv(missionIndex: number) {
    if (!canUseAbility()) return
    const count = mission.failCounts[missionIndex]
    if (count === null || count === undefined) return
    setPersonalClues((prev) => [
      ...prev,
      `《CCTV》 ${missionIndex + 1}차 원정 — 실패 카드 ${count}장.`,
    ])
    setAbilityUsed(true)
  }

  function erode(targetId: string) {
    if (!canUseAbility()) return
    setErosionTargetId(targetId)
    setPersonalClues((prev) => [...prev, `《침식》 ${displayName(targetId)}을(를) 표적으로 삼았다.`])
    setAbilityUsed(true)
  }

  function forgeResult() {
    if (!canUseAbility() || !viewerId) return
    if (!mission.proposedTeam.includes(viewerId)) return
    if (mission.missionResults[mission.missionIndex] !== 'success') return
    dispatch({ type: 'FORGE_RESULT' })
    setAbilityUsed(true)
  }

  function revengerCheck(targetId: string) {
    if (!canUseAbility()) return
    const target = CHARACTERS.find((c) => c.id === targetId)!
    let resultText: string
    if (protectedId === targetId) {
      resultText = `《공략》 ${displayName(targetId)} — 보호받고 있어 판별 불가.`
    } else {
      const team = resolveTeamCheck(targetId)
      const trueRoleLabel = team === target.team ? target.role : team === 'ward' ? '선(위장 감지)' : '악'
      resultText = `《공략》 ${displayName(targetId)}의 진짜 정체 — ${trueRoleLabel}.`
    }
    setPersonalClues((prev) => [...prev, resultText])
    setAbilityUsed(true)
  }

  const forgottenIdentity: 'ward' | 'sin' | null = (() => {
    if (!viewerId) return null
    const viewer = CHARACTERS.find((c) => c.id === viewerId)!
    if (viewer.role !== '망각자') return null
    if (mission.missionResults[2] === null) return null
    let fails = 0
    for (let i = 0; i < 3; i++) {
      const team = mission.teamHistory[i]
      if (team && team.includes(viewerId) && mission.missionResults[i] === 'fail') fails++
    }
    return fails >= 2 ? 'sin' : 'ward'
  })()

  function confirmProposal(team: string[]) {
    dispatch({ type: 'CONFIRM_PROPOSAL', team })
  }
  function castVote(approve: boolean) {
    if (!viewerId) return
    dispatch({ type: 'CAST_VOTE', viewerId, approve })
  }
  function submitCard(card: 'success' | 'fail' | null) {
    if (!viewerId) return
    dispatch({ type: 'SUBMIT_CARD', viewerId, card })
  }
  function continueMission() {
    dispatch({ type: 'CONTINUE' })
  }
  function resetMission() {
    dispatch({ type: 'RESET' })
  }

  const value = useMemo(
    () => ({
      viewerId,
      isAdmin,
      setViewerId,
      nickname,
      setNickname,
      grade,
      photo,
      updatePhoto,
      signedUp,
      roleRevealed,
      completeSignup,
      acknowledgeRole,
      displayName,
      activeTab,
      setActiveTab,
      roomOccupancy,
      joinRoom,
      leaveRoom,
      roomMessages,
      sendRoomMessage,
      roomEvents,
      submitRoomAnswer,
      dispatchRoomPuzzle,
      closeRoomInvestigation,
      classroomMessages,
      sendClassroomMessage,
      classroom,
      dispatchClassroomEvent,
      dispatchPuzzle,
      submitPuzzleAnswer,
      closeInvestigation,
      attemptDuel,
      feed,
      toggleHeart,
      addComment,
      toggleCommentsEnabled,
      createFeedPost,
      gmReveal,
      broadcast,
      sendBroadcast,
      dismissBroadcast,
      missionsOpen,
      openMissions,
      mission,
      confirmProposal,
      castVote,
      submitCard,
      continueMission,
      resetMission,
      abilityUnlocked,
      abilityUsed,
      personalClues,
      forgottenIdentity,
      useRecordBook,
      investigate,
      protect,
      protectedId,
      checkCctv,
      erode,
      erosionTargetId,
      forgeResult,
      revengerCheck,
    }),
    [
      viewerId,
      isAdmin,
      nickname,
      grade,
      photo,
      signedUp,
      roleRevealed,
      activeTab,
      roomOccupancy,
      roomMessages,
      roomEvents,
      classroomMessages,
      classroom,
      feed,
      gmReveal,
      broadcast,
      missionsOpen,
      mission,
      abilityUnlocked,
      abilityUsed,
      personalClues,
      protectedId,
      erosionTargetId,
      forgottenIdentity,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
