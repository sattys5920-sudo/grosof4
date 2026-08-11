import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from 'react'
import { CHARACTERS, ROOMS } from '../data/characters'
import { ROOM_EVENTS } from '../data/events'
import { INITIAL_FEED } from '../data/feed'
import { DM_REPLIES } from '../data/dmReplies'
import type {
  Broadcast,
  BroadcastKind,
  ChatMessage,
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
  viewerId: string
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
  attemptRoomEvent: (roomId: RoomId) => void
  classroom: ClassroomState
  dispatchClassroomEvent: (item: EventLibraryItem) => void
  closeInvestigation: () => void
  joinInvestigation: () => void
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

function initialRoomEvents(): Record<RoomId, RoomEventState> {
  const result = {} as Record<RoomId, RoomEventState>
  for (const room of ROOMS) {
    result[room.id] = { event: ROOM_EVENTS[room.id], participants: [], cleared: false, clue: null }
  }
  return result
}

function initialClassroom(): ClassroomState {
  return { status: 'locked', event: null, participants: [], hint: null, note: null }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [viewerId, setViewerId] = useState(CHARACTERS[0].id)
  const [nickname, setNickname] = useState(CHARACTERS[0].name)
  const [grade, setGrade] = useState('1학년')
  const [photo, setPhoto] = useState<string | null>(null)
  const [signedUp, setSignedUp] = useState(false)
  const [roleRevealed, setRoleRevealed] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('main')
  const [roomOccupancy, setRoomOccupancy] = useState(INITIAL_OCCUPANCY)
  const [roomMessages, setRoomMessages] = useState(INITIAL_ROOM_MESSAGES)
  const [roomEvents, setRoomEvents] = useState<Record<RoomId, RoomEventState>>(initialRoomEvents)
  const [classroom, setClassroom] = useState<ClassroomState>(initialClassroom)
  const [feed, setFeed] = useState<FeedPost[]>(INITIAL_FEED)
  const [gmReveal, setGmReveal] = useState(false)
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [missionsOpen, setMissionsOpen] = useState(false)
  const [dmThreads, setDmThreads] = useState<Record<string, ChatMessage[]>>({})
  const [activeDmId, setActiveDmId] = useState<string | null>(null)
  const [mission, dispatch] = useReducer(missionReducer, undefined, initialMissionState)

  function completeSignup(newNickname: string, newGrade: string, newPhoto: string | null, adminCode: string) {
    const assigned = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]
    setViewerId(assigned.id)
    setNickname(newNickname.trim() || assigned.name)
    setGrade(newGrade)
    setPhoto(newPhoto)
    setGmReveal(adminCode.trim() === ADMIN_CODE)
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
    if (!activeDmId || !text.trim()) return
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
    setRoomOccupancy((prev) => ({
      ...prev,
      [roomId]: prev[roomId].filter((id) => id !== viewerId),
    }))
  }

  function sendRoomMessage(roomId: RoomId, text: string) {
    if (!text.trim()) return
    setRoomMessages((prev) => ({
      ...prev,
      [roomId]: [
        ...prev[roomId],
        { id: `${roomId}-${prev[roomId].length + 1}`, authorId: viewerId, text: text.trim(), time: '지금' },
      ],
    }))
  }

  function attemptRoomEvent(roomId: RoomId) {
    setRoomEvents((prev) => {
      const state = prev[roomId]
      if (state.cleared) return prev
      const capacity = ROOMS.find((r) => r.id === roomId)!.capacity
      const present = roomOccupancy[roomId]
      const cleared = present.length >= capacity
      return {
        ...prev,
        [roomId]: {
          ...state,
          participants: present,
          cleared,
          clue: cleared ? state.event!.reward : null,
        },
      }
    })
  }

  function dispatchClassroomEvent(item: EventLibraryItem) {
    if (!item.implemented) return
    setClassroom({
      status: 'active',
      event: {
        title: item.title,
        description: item.description,
        needed: item.needed ?? 1,
        reward: item.reward ?? '',
        kind: item.dispatchKind === 'duel' ? 'duel' : 'group',
      },
      participants: [],
      hint: null,
      note: null,
    })
  }

  function closeInvestigation() {
    setClassroom(initialClassroom())
  }

  function joinInvestigation() {
    setClassroom((prev) => {
      if (prev.status !== 'active' || !prev.event) return prev
      if (prev.participants.includes(viewerId)) return prev
      const others = CHARACTERS.map((c) => c.id).filter(
        (id) => id !== viewerId && !prev.participants.includes(id),
      )
      const shuffled = [...others].sort(() => Math.random() - 0.5)
      const needMore = Math.max(0, prev.event.needed - (prev.participants.length + 1))
      const joinedNow = [viewerId, ...shuffled.slice(0, needMore)]
      const participants = [...prev.participants, ...joinedNow]
      const cleared = participants.length >= prev.event.needed
      return {
        ...prev,
        participants,
        status: cleared ? 'cleared' : 'active',
        hint: cleared ? prev.event.reward : null,
      }
    })
  }

  function attemptDuel(choice: 'odd' | 'even') {
    setClassroom((prev) => {
      if (prev.status !== 'active' || !prev.event) return prev
      const participants = prev.participants.includes(viewerId)
        ? prev.participants
        : [...prev.participants, viewerId]
      const outcome: 'odd' | 'even' = Math.random() < 0.5 ? 'odd' : 'even'
      const win = outcome === choice
      if (win) {
        return { ...prev, participants, status: 'cleared', hint: prev.event.reward, note: null }
      }
      return {
        ...prev,
        participants,
        note: '괴이가 낮게 웃는다. "아니야." 다시 시도해볼 수 있다.',
      }
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
    if (!text.trim()) return
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

  function confirmProposal(team: string[]) {
    dispatch({ type: 'CONFIRM_PROPOSAL', team })
  }
  function castVote(approve: boolean) {
    dispatch({ type: 'CAST_VOTE', viewerId, approve })
  }
  function submitCard(card: 'success' | 'fail' | null) {
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
      attemptRoomEvent,
      classroom,
      dispatchClassroomEvent,
      closeInvestigation,
      joinInvestigation,
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
    }),
    [
      viewerId,
      nickname,
      grade,
      photo,
      signedUp,
      roleRevealed,
      activeTab,
      roomOccupancy,
      roomMessages,
      roomEvents,
      classroom,
      feed,
      gmReveal,
      broadcast,
      missionsOpen,
      mission,
      dmThreads,
      activeDmId,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
