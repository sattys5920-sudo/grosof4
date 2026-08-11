import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CHARACTERS } from '../data/characters'
import type {
  Broadcast,
  BroadcastKind,
  ChatMessage,
  ClassroomPuzzle,
  ClassroomState,
  EventLibraryItem,
  FeedComment,
  FeedPost,
  RoomEventState,
  RoomId,
  RoomPuzzle,
} from '../data/types'
import { missionReducer, type MissionState } from './missionEngine'
import { firebaseConfigured } from '../firebase'
import {
  addCommentSync,
  claimRandomSlot,
  createFeedPostSync,
  defaultSessionState,
  ensureSessionInitialized,
  feedPostToFeedPost,
  joinRoomSync,
  leaveRoomSync,
  openMissionsSync,
  patchPlayer,
  patchSession,
  runAbilityTransaction,
  sendBroadcastSync,
  sendClassroomMessageSync,
  sendRoomMessageSync,
  subscribeAllPlayers,
  subscribeFeed,
  subscribeSession,
  toggleCommentsEnabledSync,
  toggleHeartSync,
  updateClassroomSync,
  updateMissionSync,
  updateRoomEventSync,
  type FeedPostDoc,
  type PlayerDoc,
  type SessionDoc,
} from './sync'

const ADMIN_CODE = '316316316'
const LS = {
  viewerId: 'gwae_viewerId',
  isAdmin: 'gwae_isAdmin',
  adminNickname: 'gwae_adminNickname',
  roleRevealed: 'gwae_roleRevealed',
  dismissedBroadcastId: 'gwae_dismissedBroadcastId',
} as const

export type TabId = 'main' | 'classroom' | 'rooms' | 'mission' | 'profile'

interface GameState {
  viewerId: string | null
  isAdmin: boolean
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

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

function resolveTeamCheckPure(decoyUsedIn: boolean, targetId: string): { team: 'ward' | 'sin'; decoyUsed: boolean } {
  const target = CHARACTERS.find((c) => c.id === targetId)!
  if (target.role === '잠입자' && !decoyUsedIn) {
    return { team: 'ward', decoyUsed: true }
  }
  return { team: target.team === 'ward' ? 'ward' : 'sin', decoyUsed: decoyUsedIn }
}

const BROADCAST_TAG: Record<BroadcastKind, string> = { event: '이벤트', sin: '괴이', notice: '공지' }
const BROADCAST_LABEL: Record<BroadcastKind, string> = {
  event: '[긴급 이벤트]',
  sin: '[괴이 출현]',
  notice: '[관리자 쪽지]',
}

function FirebaseSetupNotice() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100svh',
        padding: 24,
        textAlign: 'center',
        color: '#d9cfbf',
        background: '#0a0908',
      }}
    >
      <p style={{ maxWidth: 360, lineHeight: 1.7 }}>
        실시간 동기화를 위한 Firebase 설정이 아직 없다....... VITE_FIREBASE_* 환경변수를 채워야
        여러 사람이 함께 접속할 수 있다.
      </p>
    </div>
  )
}

function GameProviderInner({ children }: { children: ReactNode }) {
  const [viewerId, setViewerIdLocal] = useState<string | null>(() => localStorage.getItem(LS.viewerId))
  const [isAdminFlag, setIsAdminFlag] = useState<boolean>(() => localStorage.getItem(LS.isAdmin) === 'true')
  const [adminNickname, setAdminNicknameLocal] = useState<string>(
    () => localStorage.getItem(LS.adminNickname) ?? '',
  )
  const [roleRevealed, setRoleRevealedLocal] = useState<boolean>(
    () => localStorage.getItem(LS.roleRevealed) === 'true',
  )
  const [dismissedBroadcastId, setDismissedBroadcastIdLocal] = useState<string | null>(
    () => localStorage.getItem(LS.dismissedBroadcastId),
  )
  const [activeTab, setActiveTab] = useState<TabId>('main')
  const [session, setSession] = useState<SessionDoc>(defaultSessionState)
  const [players, setPlayers] = useState<Record<string, PlayerDoc>>({})
  const [feedDocs, setFeedDocs] = useState<(FeedPostDoc & { id: string })[]>([])

  useEffect(() => {
    ensureSessionInitialized().catch(() => {})
    const unsubSession = subscribeSession(setSession)
    const unsubPlayers = subscribeAllPlayers(setPlayers)
    const unsubFeed = subscribeFeed(setFeedDocs)
    return () => {
      unsubSession()
      unsubPlayers()
      unsubFeed()
    }
  }, [])

  const signedUp = isAdminFlag || viewerId !== null
  const isAdmin = isAdminFlag
  const myPlayer = viewerId ? players[viewerId] ?? null : null
  const nickname = isAdminFlag ? adminNickname : myPlayer?.nickname ?? ''
  const grade = isAdminFlag ? '—' : myPlayer?.grade ?? '1 학년'
  const photo = isAdminFlag ? null : myPlayer?.photo ?? null
  const abilityUnlocked = myPlayer?.abilityUnlocked ?? false
  const abilityUsed = myPlayer?.abilityUsed ?? false
  const personalClues = myPlayer?.personalClues ?? []

  function displayName(id: string) {
    if (id === 'admin') return isAdminFlag ? nickname : '관리자'
    if (id === viewerId) return nickname
    return players[id]?.nickname ?? CHARACTERS.find((c) => c.id === id)?.name ?? '???'
  }

  async function completeSignup(
    newNickname: string,
    newGrade: string,
    newPhoto: string | null,
    adminCode: string,
  ) {
    if (adminCode.trim() === ADMIN_CODE) {
      const finalNickname = newNickname.trim() || '관리자'
      localStorage.setItem(LS.isAdmin, 'true')
      localStorage.setItem(LS.adminNickname, finalNickname)
      localStorage.setItem(LS.roleRevealed, 'true')
      setIsAdminFlag(true)
      setAdminNicknameLocal(finalNickname)
      setRoleRevealedLocal(true)
      return
    }
    const assignedId = await claimRandomSlot(newNickname, newGrade, newPhoto)
    localStorage.setItem(LS.viewerId, assignedId)
    localStorage.setItem(LS.roleRevealed, 'false')
    setViewerIdLocal(assignedId)
    setRoleRevealedLocal(false)
  }

  function acknowledgeRole() {
    localStorage.setItem(LS.roleRevealed, 'true')
    setRoleRevealedLocal(true)
  }

  function setNickname(name: string) {
    if (isAdminFlag) {
      localStorage.setItem(LS.adminNickname, name)
      setAdminNicknameLocal(name)
      return
    }
    if (!viewerId) return
    void patchPlayer(viewerId, { nickname: name })
  }

  function updatePhoto(newPhoto: string | null) {
    if (!viewerId || isAdminFlag) return
    void patchPlayer(viewerId, { photo: newPhoto })
  }

  function joinRoom(roomId: RoomId) {
    if (!viewerId) return
    void joinRoomSync(viewerId, roomId)
  }

  function leaveRoom(roomId: RoomId) {
    if (!viewerId) return
    void leaveRoomSync(viewerId, roomId)
  }

  function sendRoomMessage(roomId: RoomId, text: string) {
    if (!text.trim() || !viewerId) return
    const msg: ChatMessage = {
      id: `${roomId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      authorId: viewerId,
      text: text.trim(),
      time: '지금',
    }
    void sendRoomMessageSync(roomId, msg)
  }

  function sendClassroomMessage(text: string) {
    if (!text.trim() || !viewerId) return
    const msg: ChatMessage = {
      id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      authorId: viewerId,
      text: text.trim(),
      time: '지금',
    }
    void sendClassroomMessageSync(msg)
  }

  async function submitRoomAnswer(roomId: RoomId, text: string) {
    if (!text.trim()) return
    let solved = false
    await updateRoomEventSync(roomId, (state) => {
      if (state.cleared || !state.event?.answer) return state
      const correct = normalize(text) === normalize(state.event.answer)
      if (correct) {
        solved = true
        return { ...state, cleared: true, clue: state.event.reward, note: null }
      }
      return { ...state, note: '오답이다. 다시 생각해보자.' }
    })
    if (solved && viewerId && (session.roomOccupancy[roomId] ?? []).includes(viewerId)) {
      void patchPlayer(viewerId, { abilityUnlocked: true })
    }
  }

  function dispatchRoomPuzzle(roomId: RoomId, puzzle: RoomPuzzle) {
    void updateRoomEventSync(roomId, () => ({
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
    }))
  }

  function closeRoomInvestigation(roomId: RoomId) {
    void updateRoomEventSync(roomId, () => ({ event: null, cleared: false, clue: null, note: null }))
  }

  function dispatchClassroomEvent(item: EventLibraryItem) {
    if (!item.implemented || item.dispatchKind !== 'duel') return
    void updateClassroomSync(() => ({
      status: 'active',
      event: { title: item.title, description: item.description, reward: item.reward ?? '', kind: 'duel' },
      hint: null,
      note: null,
    }))
  }

  function dispatchPuzzle(puzzle: ClassroomPuzzle) {
    void updateClassroomSync(() => ({
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
    }))
    void patchSession({ classroomMessages: [] })
  }

  function closeInvestigation() {
    void updateClassroomSync(() => ({ status: 'locked', event: null, hint: null, note: null }))
  }

  function submitPuzzleAnswer(text: string) {
    if (!text.trim()) return
    void updateClassroomSync((prev) => {
      if (prev.status !== 'active' || !prev.event?.answer) return prev
      const correct = normalize(text) === normalize(prev.event.answer)
      if (correct) return { ...prev, status: 'cleared', hint: prev.event.reward, note: null }
      return { ...prev, note: '오답이다. 다시 논의해보자.' }
    })
  }

  function attemptDuel(choice: 'odd' | 'even') {
    void updateClassroomSync((prev) => {
      if (prev.status !== 'active' || !prev.event) return prev
      const outcome: 'odd' | 'even' = Math.random() < 0.5 ? 'odd' : 'even'
      const win = outcome === choice
      if (win) return { ...prev, status: 'cleared', hint: prev.event.reward, note: null }
      return { ...prev, note: '괴이가 낮게 웃는다. "아니야." 다시 시도해볼 수 있다.' }
    })
  }

  function toggleHeart(postId: string) {
    const myId = viewerId ?? (isAdminFlag ? 'admin' : null)
    if (!myId) return
    void toggleHeartSync(postId, myId)
  }

  function addComment(postId: string, text: string, secret: boolean) {
    if (!text.trim() || !signedUp) return
    const authorId = viewerId ?? 'admin'
    const comment: FeedComment = {
      id: `${postId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      authorId,
      text: text.trim(),
      secret,
    }
    void addCommentSync(postId, comment)
  }

  function toggleCommentsEnabled(postId: string) {
    void toggleCommentsEnabledSync(postId)
  }

  function createFeedPost(title: string, body: string, commentsEnabled: boolean) {
    if (!title.trim() || !body.trim()) return
    void createFeedPostSync({
      authorLabel: '[관리자]',
      tag: '공지',
      title: title.trim(),
      body: body.trim(),
      time: '방금',
      commentsEnabled,
    })
  }

  function sendBroadcast(kind: BroadcastKind, title: string, body: string) {
    if (!title.trim() || !body.trim()) return
    const id = `bc-${Date.now()}`
    const bc: Broadcast = { id, kind, title: title.trim(), body: body.trim() }
    void sendBroadcastSync(bc)
    void createFeedPostSync({
      authorLabel: BROADCAST_LABEL[kind],
      tag: BROADCAST_TAG[kind],
      title: title.trim(),
      body: body.trim(),
      time: '방금',
      commentsEnabled: false,
    })
  }

  function dismissBroadcast() {
    if (!session.broadcast) return
    localStorage.setItem(LS.dismissedBroadcastId, session.broadcast.id)
    setDismissedBroadcastIdLocal(session.broadcast.id)
  }

  function openMissions() {
    void openMissionsSync()
  }

  function confirmProposal(team: string[]) {
    void updateMissionSync((m) => missionReducer(m, { type: 'CONFIRM_PROPOSAL', team }))
  }
  function castVote(approve: boolean) {
    if (!viewerId) return
    void updateMissionSync((m) => missionReducer(m, { type: 'CAST_VOTE', viewerId, approve }))
  }
  function submitCard(card: 'success' | 'fail' | null) {
    if (!viewerId) return
    void updateMissionSync((m) => missionReducer(m, { type: 'SUBMIT_CARD', viewerId, card }))
  }
  function continueMission() {
    void updateMissionSync((m) => missionReducer(m, { type: 'CONTINUE' }))
  }
  function resetMission() {
    void updateMissionSync((m) => missionReducer(m, { type: 'RESET' }))
  }

  function useRecordBook() {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUsed) return {}
      const others = CHARACTERS.filter((c) => c.id !== viewerId)
      const shuffled = [...others].sort(() => Math.random() - 0.5)
      const [a, b] = shuffled.slice(0, 2)
      const lieOnA = Math.random() < 0.5
      const teamLabel = (team: 'ward' | 'sin') => (team === 'ward' ? '선' : '악')
      const firstCheck = resolveTeamCheckPure(sess.decoyUsed, a.id)
      const secondCheck = resolveTeamCheckPure(firstCheck.decoyUsed, b.id)
      const trueA = firstCheck.team
      const trueB = secondCheck.team
      const shownA = lieOnA ? (trueA === 'ward' ? 'sin' : 'ward') : trueA
      const shownB = !lieOnA ? (trueB === 'ward' ? 'sin' : 'ward') : trueB
      const text = `《출석부》 ${displayName(a.id)} = ${teamLabel(shownA)}, ${displayName(b.id)} = ${teamLabel(shownB)} — 둘 중 하나는 거짓이다.`
      return {
        session: secondCheck.decoyUsed !== sess.decoyUsed ? { decoyUsed: secondCheck.decoyUsed } : undefined,
        player: { abilityUsed: true, personalClues: [...player.personalClues, text] },
      }
    })
  }

  function investigate(targetId: string) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUsed) return {}
      let resultText: string
      let decoyUsed = sess.decoyUsed
      if (sess.protectedId === targetId) {
        resultText = `《학생부 조사》 ${displayName(targetId)} — 보호받고 있어 판별 불가.`
      } else {
        const check = resolveTeamCheckPure(decoyUsed, targetId)
        decoyUsed = check.decoyUsed
        resultText = `《학생부 조사》 ${displayName(targetId)} — 실패 카드를 ${check.team === 'sin' ? '낼 수 있다' : '낼 수 없다'}.`
      }
      return {
        session: decoyUsed !== sess.decoyUsed ? { decoyUsed } : undefined,
        player: { abilityUsed: true, personalClues: [...player.personalClues, resultText] },
      }
    })
  }

  function protect(targetId: string) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (_sess, player) => {
      if (!player.abilityUnlocked || player.abilityUsed) return {}
      const text = `《동행》 ${displayName(targetId)}을(를) 보호하기 시작했다.`
      return {
        session: { protectedId: targetId },
        player: { abilityUsed: true, personalClues: [...player.personalClues, text] },
      }
    })
  }

  function checkCctv(missionIndex: number) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUsed) return {}
      const count = sess.mission.failCounts[missionIndex]
      if (count === null || count === undefined) return {}
      const text = `《CCTV》 ${missionIndex + 1} 차 원정 — 실패 카드 ${count} 장.`
      return { player: { abilityUsed: true, personalClues: [...player.personalClues, text] } }
    })
  }

  function erode(targetId: string) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (_sess, player) => {
      if (!player.abilityUnlocked || player.abilityUsed) return {}
      const text = `《침식》 ${displayName(targetId)}을(를) 표적으로 삼았다.`
      return {
        session: { erosionTargetId: targetId },
        player: { abilityUsed: true, personalClues: [...player.personalClues, text] },
      }
    })
  }

  function forgeResult() {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUsed) return {}
      if (!sess.mission.proposedTeam.includes(viewerId)) return {}
      if (sess.mission.missionResults[sess.mission.missionIndex] !== 'success') return {}
      const nextMission = missionReducer(sess.mission, { type: 'FORGE_RESULT' })
      return { session: { mission: nextMission }, player: { abilityUsed: true } }
    })
  }

  function revengerCheck(targetId: string) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUsed) return {}
      let resultText: string
      let decoyUsed = sess.decoyUsed
      if (sess.protectedId === targetId) {
        resultText = `《공략》 ${displayName(targetId)} — 보호받고 있어 판별 불가.`
      } else {
        const target = CHARACTERS.find((c) => c.id === targetId)!
        const check = resolveTeamCheckPure(decoyUsed, targetId)
        decoyUsed = check.decoyUsed
        const trueRoleLabel =
          check.team === target.team ? target.role : check.team === 'ward' ? '선(위장 감지)' : '악'
        resultText = `《공략》 ${displayName(targetId)}의 진짜 정체 — ${trueRoleLabel}.`
      }
      return {
        session: decoyUsed !== sess.decoyUsed ? { decoyUsed } : undefined,
        player: { abilityUsed: true, personalClues: [...player.personalClues, resultText] },
      }
    })
  }

  const forgottenIdentity: 'ward' | 'sin' | null = (() => {
    if (!viewerId) return null
    const viewer = CHARACTERS.find((c) => c.id === viewerId)!
    if (viewer.role !== '망각자') return null
    if (session.mission.missionResults[2] === null) return null
    let fails = 0
    for (let i = 0; i < 3; i++) {
      const team = session.mission.teamHistory[i]
      if (team && team.includes(viewerId) && session.mission.missionResults[i] === 'fail') fails++
    }
    return fails >= 2 ? 'sin' : 'ward'
  })()

  const myId = viewerId ?? 'admin'
  const feed: FeedPost[] = feedDocs.map((d) => feedPostToFeedPost(d.id, d, myId))
  const broadcast = session.broadcast && session.broadcast.id !== dismissedBroadcastId ? session.broadcast : null

  const value = useMemo<GameState>(
    () => ({
      viewerId,
      isAdmin,
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
      roomOccupancy: session.roomOccupancy,
      joinRoom,
      leaveRoom,
      roomMessages: session.roomMessages,
      sendRoomMessage,
      roomEvents: session.roomEvents,
      submitRoomAnswer,
      dispatchRoomPuzzle,
      closeRoomInvestigation,
      classroomMessages: session.classroomMessages,
      sendClassroomMessage,
      classroom: session.classroom,
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
      gmReveal: isAdmin,
      broadcast,
      sendBroadcast,
      dismissBroadcast,
      missionsOpen: session.missionsOpen,
      openMissions,
      mission: session.mission,
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
      protectedId: session.protectedId,
      checkCctv,
      erode,
      erosionTargetId: session.erosionTargetId,
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
      session,
      feed,
      broadcast,
      abilityUnlocked,
      abilityUsed,
      personalClues,
      forgottenIdentity,
    ],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function GameProvider({ children }: { children: ReactNode }) {
  if (!firebaseConfigured) return <FirebaseSetupNotice />
  return <GameProviderInner>{children}</GameProviderInner>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
