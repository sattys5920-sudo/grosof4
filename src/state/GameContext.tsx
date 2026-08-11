import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from 'react'
import { CHARACTERS, ROOMS } from '../data/characters'
import type { RoomId } from '../data/types'
import { initialMissionState, missionReducer, type MissionState } from './missionEngine'

export type TabId = 'home' | 'rooms' | 'mission' | 'profile'

interface GameState {
  viewerId: string
  setViewerId: (id: string) => void
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  roomOccupancy: Record<RoomId, string[]>
  joinRoom: (roomId: RoomId) => void
  leaveRoom: (roomId: RoomId) => void
  gmReveal: boolean
  setGmReveal: (v: boolean) => void
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

export function GameProvider({ children }: { children: ReactNode }) {
  const [viewerId, setViewerId] = useState(CHARACTERS[0].id)
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [roomOccupancy, setRoomOccupancy] = useState(INITIAL_OCCUPANCY)
  const [gmReveal, setGmReveal] = useState(false)
  const [mission, dispatch] = useReducer(missionReducer, undefined, initialMissionState)

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
      activeTab,
      setActiveTab,
      roomOccupancy,
      joinRoom,
      leaveRoom,
      gmReveal,
      setGmReveal,
      mission,
      confirmProposal,
      castVote,
      submitCard,
      continueMission,
      resetMission,
    }),
    [viewerId, activeTab, roomOccupancy, gmReveal, mission],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
