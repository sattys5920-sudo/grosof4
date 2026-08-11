import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from 'react'
import { CHARACTERS, ROOMS } from '../data/characters'
import { CLASSROOM_EVENTS, ROOM_EVENTS } from '../data/events'
import { INITIAL_FEED } from '../data/feed'
import type {
  Broadcast,
  BroadcastKind,
  ChatMessage,
  ClassroomState,
  FeedPost,
  RoomEventState,
  RoomId,
} from '../data/types'
import { initialMissionState, missionReducer, type MissionState } from './missionEngine'

export type TabId = 'main' | 'classroom' | 'rooms' | 'mission' | 'profile'

interface GameState {
  viewerId: string
  setViewerId: (id: string) => void
  nickname: string
  setNickname: (name: string) => void
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
  startInvestigation: () => void
  joinInvestigation: () => void
  feed: FeedPost[]
  toggleHeart: (postId: string) => void
  addComment: (postId: string, text: string) => void
  gmReveal: boolean
  setGmReveal: (v: boolean) => void
  broadcast: Broadcast | null
  sendBroadcast: (kind: BroadcastKind, title: string, body: string) => void
  dismissBroadcast: () => void
  mission: MissionState
  confirmProposal: (team: string[]) => void
  castVote: (approve: boolean) => void
  submitCard: (card: 'success' | 'fail' | null) => void
  continueMission: () => void
  resetMission: () => void
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
  return { status: 'locked', event: null, participants: [], hint: null, presetIndex: 0 }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [viewerId, setViewerId] = useState(CHARACTERS[0].id)
  const [nickname, setNickname] = useState(CHARACTERS[0].name)
  const [activeTab, setActiveTab] = useState<TabId>('main')
  const [roomOccupancy, setRoomOccupancy] = useState(INITIAL_OCCUPANCY)
  const [roomMessages, setRoomMessages] = useState(INITIAL_ROOM_MESSAGES)
  const [roomEvents, setRoomEvents] = useState<Record<RoomId, RoomEventState>>(initialRoomEvents)
  const [classroom, setClassroom] = useState<ClassroomState>(initialClassroom)
  const [feed, setFeed] = useState<FeedPost[]>(INITIAL_FEED)
  const [gmReveal, setGmReveal] = useState(false)
  const [broadcast, setBroadcast] = useState<Broadcast | null>(null)
  const [mission, dispatch] = useReducer(missionReducer, undefined, initialMissionState)

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

  function startInvestigation() {
    setClassroom((prev) => {
      const nextIndex = prev.presetIndex % CLASSROOM_EVENTS.length
      return {
        status: 'active',
        event: CLASSROOM_EVENTS[nextIndex],
        participants: [],
        hint: null,
        presetIndex: prev.presetIndex + 1,
      }
    })
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
      startInvestigation,
      joinInvestigation,
      feed,
      toggleHeart,
      addComment,
      gmReveal,
      setGmReveal,
      broadcast,
      sendBroadcast,
      dismissBroadcast,
      mission,
      confirmProposal,
      castVote,
      submitCard,
      continueMission,
      resetMission,
    }),
    [
      viewerId,
      nickname,
      activeTab,
      roomOccupancy,
      roomMessages,
      roomEvents,
      classroom,
      feed,
      gmReveal,
      broadcast,
      mission,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
