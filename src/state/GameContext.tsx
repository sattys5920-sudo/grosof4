import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ABILITY_MAX_USES, CHARACTERS, ROOMS } from '../data/characters'
import { creatureById } from '../data/creatures'
import { shopItemById } from '../data/shop'
import type {
  Broadcast,
  BroadcastKind,
  ChatMessage,
  ClassroomPuzzle,
  ClassroomState,
  CombatLogEntry,
  Creature,
  EventLibraryItem,
  FeedComment,
  FeedPost,
  RoomEventState,
  RoomId,
  RoomPuzzle,
} from '../data/types'
import { initialMissionState, missionReducer, type MissionState } from './missionEngine'
import { firebaseConfigured } from '../firebase'
import {
  addClueSync,
  addCommentSync,
  assignRoleManuallySync,
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
  runCombatTransaction,
  sendBroadcastSync,
  sendClassroomMessageSync,
  sendGmDmMessageSync,
  sendMissionMessageSync,
  sendRoomMessageSync,
  setDiscussionOpenSync,
  subscribeAllPlayers,
  subscribeFeed,
  subscribeSession,
  toggleCommentsEnabledSync,
  toggleHeartSync,
  updateClassroomSync,
  updateMissionSync,
  updateRoomEventSync,
  type ClueItem,
  type FeedPostDoc,
  type PlayerDoc,
  type SessionDoc,
} from './sync'

const ATTACK_STAMINA_COST = 10
const BASE_ATK = 5

function rollD20(): number {
  return 1 + Math.floor(Math.random() * 20)
}

function makeCombatLog(text: string): CombatLogEntry {
  return { id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text }
}

function applyItemEffect(
  item: { kind: 'weapon' | 'armor' | 'food' | 'medicine'; amount: number },
  target: PlayerDoc,
): Partial<PlayerDoc> {
  switch (item.kind) {
    case 'food':
      return { stamina: Math.min(100, target.stamina + item.amount) }
    case 'medicine':
      return { hp: Math.min(100, target.hp + item.amount) }
    case 'weapon':
      return { weaponAtkBonus: item.amount }
    case 'armor':
      return { armorDefBonus: item.amount }
  }
}

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
  openMissions: (firstPlayerId?: string) => void
  mission: MissionState
  confirmProposal: (team: string[]) => void
  castVote: (approve: boolean) => void
  submitCard: (card: 'success' | 'fail' | null) => void
  continueMission: () => void
  resetMission: () => void
  abilityUnlocked: boolean
  abilityUseCount: number
  abilityMaxUses: number
  personalClues: string[]
  forgottenIdentity: 'ward' | 'sin' | null
  useRecordBook: (targetAId: string, targetBId: string) => void
  investigate: (targetId: string) => void
  protect: (targetId: string) => void
  protectedId: string | null
  checkCctv: (missionIndex: number) => void
  erode: (targetId: string) => void
  erosionTargetId: string | null
  forgeResult: () => void
  revengerCheck: (targetId: string) => void
  armDisguise: () => void
  disguiseArmed: boolean
  hp: number
  stamina: number
  coins: number
  atk: number
  def: number
  incapacitated: boolean
  attackCreature: (roomId: RoomId) => void
  dispatchCreature: (roomId: RoomId, creature: Creature) => void
  buyItem: (itemId: string) => void
  giftItem: (itemId: string, targetId: string) => void
  createFeedPost: (title: string, body: string, commentsEnabled: boolean) => void
  toggleCommentsEnabled: (postId: string) => void
  addComment: (postId: string, text: string, secret: boolean) => void
  players: Record<string, PlayerDoc>
  gmDmMessages: ChatMessage[]
  sendGmDm: (text: string) => void
  sendGmDmAsAdmin: (characterId: string, text: string) => void
  collectedClues: ClueItem[]
  missionMessages: ChatMessage[]
  sendMissionMessage: (text: string) => void
  discussionOpen: boolean
  discussionOpenedAt: number | null
  setDiscussionOpen: (open: boolean) => void
  assignRoleManually: (characterId: string, nickname: string) => void
}

const GameContext = createContext<GameState | null>(null)

const MAX_CLASSROOM_ATTEMPTS = 3

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

function makeClue(data: { title: string; text: string; icon?: string }, source: string): ClueItem {
  return {
    id: `clue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: data.title,
    text: data.text,
    source,
    icon: data.icon,
  }
}

function makeGmDmMsg(text: string): ChatMessage {
  return {
    id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    authorId: 'admin',
    text,
    time: '지금',
  }
}

function resolveTeamCheckPure(
  disguiseArmedIn: boolean,
  targetId: string,
): { team: 'ward' | 'sin'; disguiseArmed: boolean } {
  const target = CHARACTERS.find((c) => c.id === targetId)!
  if (target.role === '잠입자' && disguiseArmedIn) {
    return { team: 'ward', disguiseArmed: false }
  }
  return { team: target.team === 'ward' ? 'ward' : 'sin', disguiseArmed: disguiseArmedIn }
}

const BROADCAST_TAG: Record<BroadcastKind, string> = { event: '이벤트', sin: '괴이', notice: '공지' }
const BROADCAST_LABEL: Record<BroadcastKind, string> = {
  event: '[긴급 이벤트]',
  sin: '[괴이 출현]',
  notice: '[불가의 쪽지]',
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
  const abilityUseCount = myPlayer?.abilityUseCount ?? 0
  const viewerRole = viewerId ? CHARACTERS.find((c) => c.id === viewerId)?.role : undefined
  const abilityMaxUses = viewerRole ? ABILITY_MAX_USES[viewerRole] ?? 1 : 1
  const personalClues = myPlayer?.personalClues ?? []
  const hp = myPlayer?.hp ?? 100
  const stamina = myPlayer?.stamina ?? 100
  const coins = myPlayer?.coins ?? 0
  const atk = BASE_ATK + (myPlayer?.weaponAtkBonus ?? 0)
  const def = myPlayer?.armorDefBonus ?? 0
  const incapacitated = hp <= 0 || stamina <= 0

  function displayName(id: string) {
    if (id === 'admin') return '불가'
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
      const finalNickname = '불가'
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
    const authorId = viewerId ?? (isAdminFlag ? 'admin' : null)
    if (!text.trim() || !authorId) return
    const msg: ChatMessage = {
      id: `${roomId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      authorId,
      text: text.trim(),
      time: '지금',
    }
    void sendRoomMessageSync(roomId, msg)
  }

  function sendClassroomMessage(text: string) {
    const authorId = viewerId ?? (isAdminFlag ? 'admin' : null)
    if (!text.trim() || !authorId) return
    const msg: ChatMessage = {
      id: `cr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      authorId,
      text: text.trim(),
      time: '지금',
    }
    void sendClassroomMessageSync(msg)
  }

  function sendGmDm(text: string) {
    if (!text.trim() || !viewerId) return
    const msg: ChatMessage = {
      id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      authorId: viewerId,
      text: text.trim(),
      time: '지금',
    }
    void sendGmDmMessageSync(viewerId, msg)
  }

  function sendGmDmAsAdmin(characterId: string, text: string) {
    if (!text.trim() || !isAdminFlag) return
    const msg: ChatMessage = {
      id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      authorId: 'admin',
      text: text.trim(),
      time: '지금',
    }
    void sendGmDmMessageSync(characterId, msg)
  }

  async function submitRoomAnswer(roomId: RoomId, text: string) {
    if (!text.trim()) return
    let solved = false
    let clueToAdd: { title: string; text: string } | null = null
    await updateRoomEventSync(roomId, (state) => {
      if (state.cleared || !state.event?.answer) return state
      const correct = normalize(text) === normalize(state.event.answer)
      if (correct) {
        solved = true
        clueToAdd = { title: state.event.title, text: state.event.reward }
        return { ...state, cleared: true, clue: state.event.reward, note: null }
      }
      return { ...state, note: '오답이다. 다시 생각해보자.' }
    })
    if (solved && viewerId && (session.roomOccupancy[roomId] ?? []).includes(viewerId)) {
      void patchPlayer(viewerId, { abilityUnlocked: true })
    }
    if (clueToAdd) {
      const room = ROOMS.find((r) => r.id === roomId)!
      void addClueSync(makeClue(clueToAdd, room.name))
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
      combat: null,
    }))
    const room = ROOMS.find((r) => r.id === roomId)!
    sendBroadcast('event', `${room.name}이(가) 열렸다`, `《${puzzle.title}》 — 지금 ${room.name}으로 가보자.......`)
  }

  function dispatchCreature(roomId: RoomId, creature: Creature) {
    void updateRoomEventSync(roomId, () => ({
      event: {
        title: creature.name,
        description: creature.intro,
        reward: '',
        kind: 'combat',
        category: creature.category,
        icon: creature.icon,
        creatureId: creature.id,
      },
      cleared: false,
      clue: null,
      note: null,
      combat: { creatureId: creature.id, creatureHp: creature.hp, log: [], defeated: false },
    }))
    const room = ROOMS.find((r) => r.id === roomId)!
    sendBroadcast('sin', `${room.name}에서 무언가 나타났다`, `${creature.intro} — 지금 바로 ${room.name}으로 가 보자.......`)
  }

  function closeRoomInvestigation(roomId: RoomId) {
    void updateRoomEventSync(roomId, () => ({ event: null, cleared: false, clue: null, note: null, combat: null }))
  }

  function dispatchClassroomEvent(item: EventLibraryItem) {
    if (!item.implemented || item.dispatchKind !== 'duel') return
    void updateClassroomSync(() => ({
      status: 'active',
      event: { title: item.title, description: item.description, reward: item.reward ?? '', kind: 'duel' },
      hint: null,
      note: null,
      attemptsUsed: 0,
    }))
    sendBroadcast('event', '교실이 열렸다', `《${item.title}》 — 지금 교실로 모이자.......`)
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
        icon: puzzle.icon,
      },
      hint: null,
      note: null,
      attemptsUsed: 0,
    }))
    void patchSession({ classroomMessages: [] })
    sendBroadcast('event', '교실이 열렸다', `《${puzzle.title}》 — 지금 교실로 모이자.......`)
  }

  function closeInvestigation() {
    void updateClassroomSync(() => ({ status: 'locked', event: null, hint: null, note: null, attemptsUsed: 0 }))
  }

  async function submitPuzzleAnswer(text: string) {
    if (!text.trim()) return
    let clueToAdd: { title: string; text: string; icon?: string } | null = null
    await updateClassroomSync((prev) => {
      if (prev.status !== 'active' || !prev.event?.answer) return prev
      if (prev.attemptsUsed >= MAX_CLASSROOM_ATTEMPTS) return prev
      const correct = normalize(text) === normalize(prev.event.answer)
      const attemptsUsed = prev.attemptsUsed + 1
      if (correct) {
        clueToAdd = { title: prev.event.title, text: prev.event.reward, icon: prev.event.icon }
        return { ...prev, status: 'cleared', hint: prev.event.reward, note: null, attemptsUsed }
      }
      const remaining = MAX_CLASSROOM_ATTEMPTS - attemptsUsed
      return {
        ...prev,
        attemptsUsed,
        note: remaining > 0 ? '오답이다. 다시 논의해보자.' : '기회를 모두 소진했다....... 불가가 다시 열어줄 때까지 기다려야 한다.',
      }
    })
    if (clueToAdd) void addClueSync(makeClue(clueToAdd, '교실'))
  }

  async function attemptDuel(choice: 'odd' | 'even') {
    let clueToAdd: { title: string; text: string } | null = null
    await updateClassroomSync((prev) => {
      if (prev.status !== 'active' || !prev.event) return prev
      const outcome: 'odd' | 'even' = Math.random() < 0.5 ? 'odd' : 'even'
      const win = outcome === choice
      if (win) {
        clueToAdd = { title: prev.event.title, text: prev.event.reward }
        return { ...prev, status: 'cleared', hint: prev.event.reward, note: null }
      }
      return { ...prev, note: '괴이가 낮게 웃는다. "아니야." 다시 시도해볼 수 있다.' }
    })
    if (clueToAdd) void addClueSync(makeClue(clueToAdd, '교실'))
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
      authorLabel: '[불가]',
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

  function sortedPlayerIds(): string[] {
    const claimed = Object.keys(players)
    return claimed.sort((a, b) => players[a].nickname.localeCompare(players[b].nickname, 'ko'))
  }

  function openMissions(firstPlayerId?: string) {
    let turnOrder = sortedPlayerIds()
    if (turnOrder.length === 0) turnOrder = CHARACTERS.map((c) => c.id)
    if (firstPlayerId && turnOrder.includes(firstPlayerId)) {
      const idx = turnOrder.indexOf(firstPlayerId)
      turnOrder = [...turnOrder.slice(idx), ...turnOrder.slice(0, idx)]
    }
    void openMissionsSync(initialMissionState(turnOrder))
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

  function sendMissionMessage(text: string) {
    const authorId = viewerId ?? (isAdminFlag ? 'admin' : null)
    if (!text.trim() || !authorId) return
    const msg: ChatMessage = {
      id: `ms-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      authorId,
      text: text.trim(),
      time: '지금',
    }
    void sendMissionMessageSync(msg)
  }

  function setDiscussionOpen(open: boolean) {
    if (!isAdminFlag) return
    void setDiscussionOpenSync(open)
  }

  function assignRoleManually(characterId: string, nickname: string) {
    if (!isAdminFlag || !nickname.trim()) return
    void assignRoleManuallySync(characterId, nickname)
  }

  function abilityMax(role: string): number {
    return ABILITY_MAX_USES[role as keyof typeof ABILITY_MAX_USES] ?? 1
  }

  function useRecordBook(targetAId: string, targetBId: string) {
    if (!viewerId || targetAId === targetBId || targetAId === viewerId || targetBId === viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('기록자')) return {}
      const a = CHARACTERS.find((c) => c.id === targetAId)
      const b = CHARACTERS.find((c) => c.id === targetBId)
      if (!a || !b) return {}
      const lieOnA = Math.random() < 0.5
      const teamLabel = (team: 'ward' | 'sin') => (team === 'ward' ? '선' : '악')
      const firstCheck = resolveTeamCheckPure(sess.disguiseArmed, a.id)
      const secondCheck = resolveTeamCheckPure(firstCheck.disguiseArmed, b.id)
      const trueA = firstCheck.team
      const trueB = secondCheck.team
      const shownA = lieOnA ? (trueA === 'ward' ? 'sin' : 'ward') : trueA
      const shownB = !lieOnA ? (trueB === 'ward' ? 'sin' : 'ward') : trueB
      const text = `《출석부》 ${displayName(a.id)} = ${teamLabel(shownA)}, ${displayName(b.id)} = ${teamLabel(shownB)} — 둘 중 하나는 거짓이다.`
      return {
        session:
          secondCheck.disguiseArmed !== sess.disguiseArmed ? { disguiseArmed: secondCheck.disguiseArmed } : undefined,
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          personalClues: [...player.personalClues, text],
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(text)],
        },
      }
    })
  }

  function investigate(targetId: string) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('감찰자')) return {}
      let resultText: string
      let disguiseArmed = sess.disguiseArmed
      if (sess.protectedId === targetId) {
        resultText = `《학생부 조사》 ${displayName(targetId)} — 보호받고 있어 판별 불가.`
      } else {
        const check = resolveTeamCheckPure(disguiseArmed, targetId)
        disguiseArmed = check.disguiseArmed
        resultText = `《학생부 조사》 ${displayName(targetId)} — 실패 카드를 ${check.team === 'sin' ? '낼 수 있다' : '낼 수 없다'}.`
      }
      return {
        session: disguiseArmed !== sess.disguiseArmed ? { disguiseArmed } : undefined,
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          personalClues: [...player.personalClues, resultText],
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(resultText)],
        },
      }
    })
  }

  function protect(targetId: string) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (_sess, player) => {
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('보호자')) return {}
      const target = CHARACTERS.find((c) => c.id === targetId)
      if (!target || target.team !== 'ward') return {}
      const text = `《동행》 ${displayName(targetId)}을(를) 보호하기 시작했다.`
      return {
        session: { protectedId: targetId },
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          personalClues: [...player.personalClues, text],
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(text)],
        },
      }
    })
  }

  function checkCctv(missionIndex: number) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('목격자')) return {}
      const count = sess.mission.failCounts[missionIndex]
      if (count === null || count === undefined) return {}
      const text = `《CCTV》 ${missionIndex + 1} 차 원정 — 실패 카드 ${count} 장.`
      return {
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          personalClues: [...player.personalClues, text],
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(text)],
        },
      }
    })
  }

  function erode(targetId: string) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (_sess, player) => {
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('괴이의 사도')) return {}
      const text = `《침식》 ${displayName(targetId)}을(를) 표적으로 삼았다.`
      return {
        session: { erosionTargetId: targetId },
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          personalClues: [...player.personalClues, text],
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(text)],
        },
      }
    })
  }

  function forgeResult() {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('공범')) return {}
      if (!sess.mission.proposedTeam.includes(viewerId)) return {}
      if (sess.mission.missionResults[sess.mission.missionIndex] !== 'success') return {}
      const nextMission = missionReducer(sess.mission, { type: 'FORGE_RESULT' })
      const text = `《결과 위조》 ${sess.mission.missionIndex + 1} 차 원정의 결과를 몰래 조작했다.`
      return {
        session: { mission: nextMission },
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(text)],
        },
      }
    })
  }

  function revengerCheck(targetId: string) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('복수자')) return {}
      let resultText: string
      let disguiseArmed = sess.disguiseArmed
      if (sess.protectedId === targetId) {
        resultText = `《공략》 ${displayName(targetId)} — 보호받고 있어 판별 불가.`
      } else {
        const target = CHARACTERS.find((c) => c.id === targetId)!
        const check = resolveTeamCheckPure(disguiseArmed, targetId)
        disguiseArmed = check.disguiseArmed
        const trueRoleLabel =
          check.team === target.team ? target.role : check.team === 'ward' ? '선(위장 감지)' : '악'
        resultText = `《공략》 ${displayName(targetId)}의 진짜 정체 — ${trueRoleLabel}.`
      }
      return {
        session: disguiseArmed !== sess.disguiseArmed ? { disguiseArmed } : undefined,
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          personalClues: [...player.personalClues, resultText],
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(resultText)],
        },
      }
    })
  }

  function armDisguise() {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('잠입자')) return {}
      if (sess.disguiseArmed) return {}
      const text = '《위장》을 걸었다 — 다음번 정체 확인을 한 번 무효화한다.'
      return {
        session: { disguiseArmed: true },
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          personalClues: [...player.personalClues, text],
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(text)],
        },
      }
    })
  }

  function attackCreature(roomId: RoomId) {
    if (!viewerId) return
    const myId = viewerId
    void runCombatTransaction(
      myId,
      (sess) => {
        const others = (sess.roomOccupancy[roomId] ?? []).filter((id) => id !== myId)
        if (others.length === 0) return null
        return others[Math.floor(Math.random() * others.length)]
      },
      (sess, me, target, targetId) => {
        const roomEvent = sess.roomEvents[roomId]
        const combat = roomEvent?.combat
        if (!combat || combat.defeated) return {}
        if (me.hp <= 0 || me.stamina < ATTACK_STAMINA_COST) return {}
        const creature = creatureById(combat.creatureId)
        if (!creature) return {}

        const myAtk = BASE_ATK + me.weaponAtkBonus
        const roll = rollD20()
        const hit = roll + myAtk >= 10 + creature.def
        const damage = hit ? myAtk : 0
        const newCreatureHp = Math.max(0, combat.creatureHp - damage)
        const defeated = newCreatureHp <= 0

        const log: CombatLogEntry[] = [...combat.log]
        log.push(
          makeCombatLog(
            hit
              ? `${displayName(myId)}이(가) ${creature.name}을(를) 공격했다....... 명중! ${damage}의 피해를 입혔다.`
              : `${displayName(myId)}이(가) ${creature.name}을(를) 공격했다....... 빗나갔다.`,
          ),
        )

        let mePatch: Partial<PlayerDoc> = { stamina: me.stamina - ATTACK_STAMINA_COST }
        let targetPatch: Partial<PlayerDoc> | undefined

        if (defeated) {
          log.push(makeCombatLog(`${creature.name}이(가) 쓰러졌다....... 짙게 배어 있던 기운이 서서히 옅어진다.`))
          mePatch = { ...mePatch, coins: me.coins + creature.coinReward, abilityUnlocked: true }
        } else {
          const retaliateAgainstSelf = !target
          const defenderDef = retaliateAgainstSelf ? me.armorDefBonus : target!.armorDefBonus
          const rollC = rollD20()
          const hitC = rollC + creature.atk >= 10 + defenderDef
          const dmgC = hitC ? Math.max(1, creature.atk - Math.floor(defenderDef / 2)) : 0
          const defenderName = retaliateAgainstSelf ? displayName(myId) : displayName(targetId!)
          log.push(
            makeCombatLog(
              hitC
                ? `${creature.name}이(가) ${defenderName}을(를) 향해 반격했다....... 명중! ${dmgC}의 피해를 입었다.`
                : `${creature.name}이(가) ${defenderName}을(를) 향해 반격했다....... 빗나갔다.`,
            ),
          )
          if (hitC) {
            if (retaliateAgainstSelf) {
              mePatch = { ...mePatch, hp: Math.max(0, me.hp - dmgC) }
            } else {
              targetPatch = { hp: Math.max(0, target!.hp - dmgC) }
            }
          }
        }

        const nextRoomEvents = {
          ...sess.roomEvents,
          [roomId]: {
            ...roomEvent,
            combat: { ...combat, creatureHp: newCreatureHp, log, defeated },
          },
        }

        return {
          session: { roomEvents: nextRoomEvents },
          me: mePatch,
          target: targetPatch,
        }
      },
    )
  }

  function buyItem(itemId: string) {
    if (!viewerId) return
    const item = shopItemById(itemId)
    if (!item) return
    void runCombatTransaction(
      viewerId,
      () => null,
      (_sess, me) => {
        if (me.coins < item.price) return {}
        return { me: { coins: me.coins - item.price, ...applyItemEffect(item, me) } }
      },
    )
  }

  function giftItem(itemId: string, targetId: string) {
    if (!viewerId || targetId === viewerId) return
    const item = shopItemById(itemId)
    if (!item) return
    void runCombatTransaction(
      viewerId,
      () => targetId,
      (_sess, me, target) => {
        if (!target) return {}
        if (me.coins < item.price) return {}
        return {
          me: { coins: me.coins - item.price },
          target: applyItemEffect(item, target),
        }
      },
    )
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
      players,
      gmDmMessages: myPlayer?.gmDmMessages ?? [],
      sendGmDm,
      sendGmDmAsAdmin,
      collectedClues: session.collectedClues,
      missionMessages: session.missionMessages,
      sendMissionMessage,
      discussionOpen: session.discussionOpen,
      discussionOpenedAt: session.discussionOpenedAt,
      setDiscussionOpen,
      assignRoleManually,
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
      abilityUseCount,
      abilityMaxUses,
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
      armDisguise,
      disguiseArmed: session.disguiseArmed,
      hp,
      stamina,
      coins,
      atk,
      def,
      incapacitated,
      attackCreature,
      dispatchCreature,
      buyItem,
      giftItem,
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
      abilityUseCount,
      abilityMaxUses,
      personalClues,
      forgottenIdentity,
      hp,
      stamina,
      coins,
      atk,
      def,
      incapacitated,
      players,
      myPlayer,
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
