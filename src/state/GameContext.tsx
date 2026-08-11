import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from 'react'
import { CHARACTERS, ROOMS } from '../data/characters'
import { ROOM_EVENTS } from '../data/events'
import { INITIAL_FEED } from '../data/feed'
import { DM_REPLIES } from '../data/dmReplies'
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
  addComment: (postId: string, text: string) => void
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
  dmThreads: Record<string, ChatMessage[]>
  activeDmId: string | null
  openDm: (id: string) => void
  closeDm: () => void
  sendDm: (text: string) => void
  abilityUsed: boolean
  personalClues: string[]
  useWitnessMemory: () => void
  useFamilyInsight: (roomId: RoomId) => void
  spreadDisinfo: (text: string) => void
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
    { id: 'l2', authorId: 'haneul', text: '...나는 그냥 지켜볼게', time: '00:12' },
  ],
  infirmary: [{ id: 'i1', authorId: 'ayoung', text: '기록부에 그날 오후 진료 사유가 지워져 있어', time: '00:10' }],
  broadcast: [
    { id: 'b1', authorId: 'seungwoo', text: '이 채널, 3년 전에 폐기된 장비인데 왜 지금 살아있지', time: '00:13' },
    { id: 'b2', authorId: 'gihoon', text: '...나 먼저 나갈게', time: '00:14' },
  ],
  rooftop: [],
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

function initialRoomEvents(): Record<RoomId, RoomEventState> {
  const result = {} as Record<RoomId, RoomEventState>
  for (const room of ROOMS) {
    result[room.id] = { event: ROOM_EVENTS[room.id], cleared: false, clue: null, note: null }
  }
  return result
}

function initialClassroom(): ClassroomState {
  return { status: 'locked', event: null, hint: null, note: null }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [grade, setGrade] = useState('1학년')
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
  const [dmThreads, setDmThreads] = useState<Record<string, ChatMessage[]>>({})
  const [activeDmId, setActiveDmId] = useState<string | null>(null)
  const [abilityUsed, setAbilityUsed] = useState(false)
  const [personalClues, setPersonalClues] = useState<string[]>([])
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

  function openDm(id: string) {
    setActiveDmId(id)
    setDmThreads((prev) => (prev[id] ? prev : { ...prev, [id]: [] }))
  }

  function closeDm() {
    setActiveDmId(null)
  }

  function sendDm(text: string) {
    if (!activeDmId || !text.trim() || !viewerId) return
    const targetId = activeDmId
    const myMsg: ChatMessage = {
      id: `dm-${targetId}-${Date.now()}`,
      authorId: viewerId,
      text: text.trim(),
      time: '지금',
    }
    setDmThreads((prev) => ({ ...prev, [targetId]: [...(prev[targetId] ?? []), myMsg] }))
    const pool = DM_REPLIES[targetId] ?? ['...']
    const reply = pool[Math.floor(Math.random() * pool.length)]
    window.setTimeout(() => {
      setDmThreads((prev) => ({
        ...prev,
        [targetId]: [
          ...(prev[targetId] ?? []),
          { id: `dm-${targetId}-${Date.now()}-r`, authorId: targetId, text: reply, time: '지금' },
        ],
      }))
    }, 500)
  }

  function displayName(id: string) {
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
    setRoomEvents((prev) => {
      const state = prev[roomId]
      if (state.cleared || !state.event?.answer) return prev
      const correct = normalize(text) === normalize(state.event.answer)
      if (correct) {
        return { ...prev, [roomId]: { ...state, cleared: true, clue: state.event.reward, note: null } }
      }
      return { ...prev, [roomId]: { ...state, note: '오답이다. 다시 생각해보자.' } }
    })
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

  function addComment(postId: string, text: string) {
    if (!text.trim() || !viewerId) return
    setFeed((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                { id: `${postId}-${p.comments.length + 1}`, authorId: viewerId, text: text.trim() },
              ],
            }
          : p,
      ),
    )
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
        comments: [],
      },
      ...prev,
    ])
  }

  function dismissBroadcast() {
    setBroadcast(null)
  }

  function useWitnessMemory() {
    if (abilityUsed) return
    const candidates = ROOMS.filter((r) => !roomEvents[r.id].cleared)
    const pool = candidates.length > 0 ? candidates : ROOMS
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setPersonalClues((prev) => [...prev, roomEvents[pick.id].event!.reward])
    setAbilityUsed(true)
  }

  function useFamilyInsight(roomId: RoomId) {
    if (abilityUsed) return
    setPersonalClues((prev) => [...prev, roomEvents[roomId].event!.reward])
    setAbilityUsed(true)
  }

  function spreadDisinfo(text: string) {
    if (abilityUsed || !text.trim()) return
    sendBroadcast('notice', '[익명 제보]', text.trim())
    setAbilityUsed(true)
  }

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
      dmThreads,
      activeDmId,
      openDm,
      closeDm,
      sendDm,
      abilityUsed,
      personalClues,
      useWitnessMemory,
      useFamilyInsight,
      spreadDisinfo,
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
      dmThreads,
      activeDmId,
      abilityUsed,
      personalClues,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
