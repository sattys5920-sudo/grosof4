import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
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
  EndingKey,
  EventLibraryItem,
  FeedComment,
  FeedPost,
  RoomEventState,
  RoomId,
} from '../data/types'
import { initialMissionState, missionReducer, type MissionState } from './missionEngine'
import { firebaseConfigured } from '../firebase'
import {
  addClueSync,
  addCommentSync,
  assignRoleManuallySync,
  loginAccountSync,
  loginAdminAccountSync,
  registerAccountSync,
  registerAdminAccountSync,
  createFeedPostSync,
  defaultSessionState,
  ensureSessionInitialized,
  feedPostToFeedPost,
  joinRoomSync,
  leaveRoomSync,
  openMissionsSync,
  patchPlayer,
  patchSession,
  resetAllDataSync,
  revealStoryDaySync,
  revealTruthSync,
  sendEndingSync,
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
const DICE_COUNT = 10
const DICE_SUCCESS_THRESHOLD = 30

// TRPG 전투 판정: 누구나 똑같이 주사위(1d6) 10 개를 굴려 합이 30 을 넘으면 성공.
function rollDice(): number {
  let sum = 0
  for (let i = 0; i < DICE_COUNT; i++) sum += 1 + Math.floor(Math.random() * 6)
  return sum
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
  cachedNickname: 'gwae_cachedNickname',
  notifyRoomEvents: 'gwae_notifyRoomEvents',
  notifyGeneralBroadcasts: 'gwae_notifyGeneralBroadcasts',
  lastSeenDmCount: 'gwae_lastSeenDmCount',
  gmDmSeenCounts: 'gwae_gmDmSeenCounts',
  accountUsername: 'gwae_accountUsername',
} as const

export type TabId = 'main' | 'classroom' | 'rooms' | 'mission' | 'shop' | 'profile'

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
  accountUsername: string | null
  register: (username: string, password: string) => Promise<void>
  login: (username: string, password: string) => Promise<void>
  loginAsAdmin: (code: string) => void
  registerAdmin: (username: string, password: string, code: string) => Promise<void>
  loginAdmin: (username: string, password: string) => Promise<void>
  logout: () => void
  profileComplete: boolean
  completeProfile: (nickname: string, grade: string, photo: string | null) => Promise<void>
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
  clearBroadcastForAll: () => void
  notifyRoomEvents: boolean
  setNotifyRoomEvents: (on: boolean) => void
  notifyGeneralBroadcasts: boolean
  setNotifyGeneralBroadcasts: (on: boolean) => void
  enableAllNotifications: () => void
  topAlert: { id: string; text: string } | null
  dismissTopAlert: () => void
  hasUnreadDm: boolean
  markDmRead: () => void
  markDmThreadRead: (characterId: string) => void
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
  armShield: () => void
  checkCctv: (missionIndex: number) => void
  discern: (targetId: string) => void
  usedDiscernToday: boolean
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
  useItem: (itemId: string) => void
  giftItem: (itemId: string, targetId: string) => void
  inventory: Record<string, number>
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
  resetAllData: () => void
  shopOpen: boolean
  setShopOpen: (open: boolean) => void
  storyDay: 0 | 1 | 2 | 3 | 4
  revealStoryDay: (day: 1 | 2 | 3 | 4) => void
  truthRevealed: boolean
  revealTruth: () => void
  endingKey: EndingKey | null
  sendEnding: (key: EndingKey) => void
}

const GameContext = createContext<GameState | null>(null)

const MAX_CLASSROOM_ATTEMPTS = 3

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

function makeClue(data: { title: string; text: string; icon?: string | null }, source: string): ClueItem {
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
  const [accountUsername, setAccountUsernameLocal] = useState<string | null>(
    () => localStorage.getItem(LS.accountUsername),
  )
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
  const [cachedNickname, setCachedNicknameLocal] = useState<string>(
    () => localStorage.getItem(LS.cachedNickname) ?? '',
  )
  const [notifyRoomEvents, setNotifyRoomEventsLocal] = useState<boolean>(
    () => localStorage.getItem(LS.notifyRoomEvents) !== 'false',
  )
  const [notifyGeneralBroadcasts, setNotifyGeneralBroadcastsLocal] = useState<boolean>(
    () => localStorage.getItem(LS.notifyGeneralBroadcasts) !== 'false',
  )
  const [lastSeenDmCount, setLastSeenDmCountLocal] = useState<number>(
    () => Number(localStorage.getItem(LS.lastSeenDmCount) ?? '0'),
  )
  const [gmDmSeenCounts, setGmDmSeenCountsLocal] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS.gmDmSeenCounts) ?? '{}')
    } catch {
      return {}
    }
  })
  const [topAlert, setTopAlert] = useState<{ id: string; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('main')
  const [session, setSession] = useState<SessionDoc>(defaultSessionState)
  const [players, setPlayers] = useState<Record<string, PlayerDoc>>({})
  const [playersLoaded, setPlayersLoaded] = useState(false)
  const [feedDocs, setFeedDocs] = useState<(FeedPostDoc & { id: string })[]>([])

  useEffect(() => {
    ensureSessionInitialized().catch(() => {})
    const unsubSession = subscribeSession(setSession)
    const unsubPlayers = subscribeAllPlayers((p) => {
      setPlayers(p)
      setPlayersLoaded(true)
    })
    const unsubFeed = subscribeFeed(setFeedDocs)
    return () => {
      unsubSession()
      unsubPlayers()
      unsubFeed()
    }
  }, [])

  // GM이 전체 초기화를 하면, 자신의 플레이어 문서가 사라진 기기는 자동으로 가입 화면으로 되돌아간다.
  // (막 가입한 직후에는 실시간 구독이 아직 새 문서를 받기 전이라 잠깐 비어 보일 수 있으므로,
  //  한 번이라도 내 문서를 실제로 확인한 적이 있을 때만 "진짜 삭제"로 간주해 짧게 반응하고,
  //  아직 한 번도 확인하지 못했다면 — 방금 가입해 동기화를 기다리는 중일 수 있으므로 —
  //  느린 네트워크에서도 안전하도록 충분히 길게 기다린 뒤에만 초기화로 간주한다.)
  const hasSeenSelfRef = useRef(false)
  useEffect(() => {
    // 각오를 밝히기(역할 공개 확인) 전까지는 절대 되돌리지 않는다 — 읽는 도중
    // 네트워크가 잠깐 끊기거나 화면이 꺼졌다 켜져도 롤 카드가 갑자기 사라지면 안 된다.
    if (!playersLoaded || isAdminFlag || !viewerId || !roleRevealed) return
    if (players[viewerId]) {
      hasSeenSelfRef.current = true
      return
    }
    const delay = hasSeenSelfRef.current ? 8000 : 20000
    const timer = setTimeout(() => {
      localStorage.removeItem(LS.viewerId)
      localStorage.removeItem(LS.roleRevealed)
      localStorage.removeItem(LS.cachedNickname)
      setViewerIdLocal(null)
      setRoleRevealedLocal(false)
      setCachedNicknameLocal('')
    }, delay)
    return () => clearTimeout(timer)
  }, [playersLoaded, players, viewerId, isAdminFlag, roleRevealed])

  const signedUp = isAdminFlag || viewerId !== null
  const isAdmin = isAdminFlag
  const myPlayer = viewerId ? players[viewerId] ?? null : null
  const nickname = isAdminFlag ? adminNickname : myPlayer?.nickname ?? cachedNickname
  const grade = isAdminFlag ? '—' : myPlayer?.grade ?? '1 학년'
  const photo = isAdminFlag ? null : myPlayer?.photo ?? null
  // 기존(아이디/비밀번호 도입 전) 플레이어 문서에는 profileComplete 필드가 없으므로,
  // 문서가 이미 존재하면 완료로 간주해 기존 진행 상황이 프로필 설정 화면으로 되돌아가지 않게 한다.
  const profileComplete = myPlayer ? myPlayer.profileComplete ?? true : false
  const abilityUnlocked = myPlayer?.abilityUnlocked ?? false
  const abilityUseCount = myPlayer?.abilityUseCount ?? 0
  const usedDiscernToday = myPlayer?.lastDiscernDate === new Date().toISOString().slice(0, 10)
  const viewerRole = viewerId ? CHARACTERS.find((c) => c.id === viewerId)?.role : undefined
  const abilityMaxUses = viewerRole ? ABILITY_MAX_USES[viewerRole] ?? 1 : 1
  const personalClues = myPlayer?.personalClues ?? []
  const hp = myPlayer?.hp ?? 100
  const stamina = myPlayer?.stamina ?? 100
  const coins = myPlayer?.coins ?? 0
  const inventory = myPlayer?.inventory ?? {}
  const atk = BASE_ATK + (myPlayer?.weaponAtkBonus ?? 0)
  const def = myPlayer?.armorDefBonus ?? 0
  const incapacitated = hp <= 0 || stamina <= 0

  // 새 공지·괴이 출현이 뜨면 (알림 설정을 켜둔 경우) 상단바에도 짧게 알려 준다.
  const lastAlertedBroadcastIdRef = useRef<string | null>(null)
  useEffect(() => {
    const bc = session.broadcast
    if (!bc || bc.id === lastAlertedBroadcastIdRef.current) return
    lastAlertedBroadcastIdRef.current = bc.id
    const suppressed = bc.kind === 'sin' ? !notifyRoomEvents : !notifyGeneralBroadcasts
    if (suppressed) return
    setTopAlert({ id: bc.id, text: bc.title })
  }, [session.broadcast, notifyRoomEvents, notifyGeneralBroadcasts])

  // 불가가 나에게 새 쪽지를 보내면 상단바에 알려 준다 (최초 로딩 시점의 기존 대화는 제외).
  const dmInitRef = useRef(false)
  const lastDmCountRef = useRef(0)
  useEffect(() => {
    if (!viewerId || isAdminFlag) return
    const msgs = myPlayer?.gmDmMessages ?? []
    if (!dmInitRef.current) {
      dmInitRef.current = true
      lastDmCountRef.current = msgs.length
      return
    }
    if (msgs.length > lastDmCountRef.current) {
      const last = msgs[msgs.length - 1]
      if (last.authorId === 'admin') setTopAlert({ id: last.id, text: `불가: ${last.text}` })
    }
    lastDmCountRef.current = msgs.length
  }, [myPlayer?.gmDmMessages, viewerId, isAdminFlag])

  // 불가 화면에서는 누구든 새로 보낸 쪽지가 오면 상단바에 알려 준다.
  const gmDmInitRef = useRef(false)
  const lastGmInboxTotalRef = useRef(0)
  useEffect(() => {
    if (!isAdminFlag) return
    let total = 0
    let latestFrom: string | null = null
    let latestMsg: ChatMessage | null = null
    for (const [pid, p] of Object.entries(players)) {
      const fromPlayer = (p.gmDmMessages ?? []).filter((m) => m.authorId !== 'admin')
      total += fromPlayer.length
      const last = fromPlayer[fromPlayer.length - 1]
      if (last && (!latestMsg || Number(last.id.split('-')[1]) > Number(latestMsg.id.split('-')[1]))) {
        latestMsg = last
        latestFrom = pid
      }
    }
    if (!gmDmInitRef.current) {
      gmDmInitRef.current = true
      lastGmInboxTotalRef.current = total
      return
    }
    if (total > lastGmInboxTotalRef.current && latestMsg && latestFrom) {
      const senderName = players[latestFrom]?.nickname ?? CHARACTERS.find((c) => c.id === latestFrom)?.name ?? '???'
      setTopAlert({ id: latestMsg.id, text: `${senderName}: ${latestMsg.text}` })
    }
    lastGmInboxTotalRef.current = total
  }, [players, isAdminFlag])

  // 로그아웃 후 다른 계정으로 다시 가입·로그인하면, 이전 계정에서 쌓인 추적 상태(ref)가
  // 새 계정으로 새어들어 오작동(예: 되돌리기 판정 오류)을 일으키지 않도록 초기화한다.
  const prevViewerIdRef = useRef(viewerId)
  useEffect(() => {
    if (prevViewerIdRef.current === viewerId) return
    prevViewerIdRef.current = viewerId
    hasSeenSelfRef.current = false
    dmInitRef.current = false
    lastDmCountRef.current = 0
  }, [viewerId])

  function dismissTopAlert() {
    setTopAlert(null)
  }

  const hasUnreadDm = isAdminFlag
    ? Object.entries(players).some(
        ([pid, p]) => (p.gmDmMessages ?? []).filter((m) => m.authorId !== 'admin').length > (gmDmSeenCounts[pid] ?? 0),
      )
    : (myPlayer?.gmDmMessages?.length ?? 0) > lastSeenDmCount

  function markDmRead() {
    if (!viewerId) return
    const count = myPlayer?.gmDmMessages?.length ?? 0
    localStorage.setItem(LS.lastSeenDmCount, String(count))
    setLastSeenDmCountLocal(count)
  }

  function markDmThreadRead(characterId: string) {
    const count = (players[characterId]?.gmDmMessages ?? []).filter((m) => m.authorId !== 'admin').length
    const next = { ...gmDmSeenCounts, [characterId]: count }
    localStorage.setItem(LS.gmDmSeenCounts, JSON.stringify(next))
    setGmDmSeenCountsLocal(next)
  }

  function displayName(id: string) {
    if (id === 'admin') return '불가'
    if (id === viewerId) return nickname
    return players[id]?.nickname ?? CHARACTERS.find((c) => c.id === id)?.name ?? '???'
  }

  async function register(username: string, password: string) {
    const assignedId = await registerAccountSync(username, password)
    const uname = username.trim().toLowerCase()
    localStorage.setItem(LS.viewerId, assignedId)
    localStorage.setItem(LS.roleRevealed, 'false')
    localStorage.setItem(LS.accountUsername, uname)
    setViewerIdLocal(assignedId)
    setRoleRevealedLocal(false)
    setAccountUsernameLocal(uname)
  }

  async function login(username: string, password: string) {
    const characterId = await loginAccountSync(username, password)
    const uname = username.trim().toLowerCase()
    localStorage.setItem(LS.viewerId, characterId)
    localStorage.setItem(LS.roleRevealed, 'true')
    localStorage.setItem(LS.accountUsername, uname)
    setViewerIdLocal(characterId)
    setRoleRevealedLocal(true)
    setAccountUsernameLocal(uname)
  }

  function loginAsAdmin(code: string) {
    if (code.trim() !== ADMIN_CODE) throw new Error('코드가 올바르지 않다.')
    const finalNickname = '불가'
    localStorage.setItem(LS.isAdmin, 'true')
    localStorage.setItem(LS.adminNickname, finalNickname)
    localStorage.setItem(LS.roleRevealed, 'true')
    setIsAdminFlag(true)
    setAdminNicknameLocal(finalNickname)
    setRoleRevealedLocal(true)
  }

  function enterAdminAccount(username: string) {
    const uname = username.trim().toLowerCase()
    const finalNickname = '불가'
    localStorage.setItem(LS.isAdmin, 'true')
    localStorage.setItem(LS.adminNickname, finalNickname)
    localStorage.setItem(LS.roleRevealed, 'true')
    localStorage.setItem(LS.accountUsername, uname)
    setIsAdminFlag(true)
    setAdminNicknameLocal(finalNickname)
    setRoleRevealedLocal(true)
    setAccountUsernameLocal(uname)
  }

  async function registerAdmin(username: string, password: string, code: string) {
    if (code.trim() !== ADMIN_CODE) throw new Error('관리자 코드가 올바르지 않다.')
    await registerAdminAccountSync(username, password)
    enterAdminAccount(username)
  }

  async function loginAdmin(username: string, password: string) {
    await loginAdminAccountSync(username, password)
    enterAdminAccount(username)
  }

  function logout() {
    localStorage.removeItem(LS.viewerId)
    localStorage.removeItem(LS.roleRevealed)
    localStorage.removeItem(LS.cachedNickname)
    localStorage.removeItem(LS.accountUsername)
    localStorage.removeItem(LS.isAdmin)
    localStorage.removeItem(LS.adminNickname)
    setViewerIdLocal(null)
    setRoleRevealedLocal(false)
    setCachedNicknameLocal('')
    setAccountUsernameLocal(null)
    setIsAdminFlag(false)
    setAdminNicknameLocal('')
  }

  async function completeProfile(newNickname: string, newGrade: string, newPhoto: string | null) {
    if (!viewerId) return
    const finalNickname = newNickname.trim() || CHARACTERS.find((c) => c.id === viewerId)!.name
    await patchPlayer(viewerId, { nickname: finalNickname, grade: newGrade, photo: newPhoto, profileComplete: true })
    localStorage.setItem(LS.cachedNickname, finalNickname)
    setCachedNicknameLocal(finalNickname)
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
    localStorage.setItem(LS.cachedNickname, name)
    setCachedNicknameLocal(name)
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

  function dispatchCreature(roomId: RoomId, creature: Creature) {
    void updateRoomEventSync(roomId, () => ({
      event: {
        title: creature.name,
        description: creature.intro,
        reward: '',
        kind: 'combat',
        category: creature.category,
        icon: creature.icon ?? null,
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
    sendBroadcast('event', '강당이 열렸다', `《${item.title}》 — 지금 강당으로 모이자.......`, false)
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
        icon: puzzle.icon ?? null,
        diagram: puzzle.diagram ?? null,
      },
      hint: null,
      note: null,
      attemptsUsed: 0,
    }))
    void patchSession({ classroomMessages: [] })
    sendBroadcast('event', '강당이 열렸다', `《${puzzle.title}》 — 지금 강당으로 모이자.......`, false)
  }

  function closeInvestigation() {
    void updateClassroomSync(() => ({ status: 'locked', event: null, hint: null, note: null, attemptsUsed: 0 }))
  }

  async function submitPuzzleAnswer(text: string) {
    if (!text.trim()) return
    let clueToAdd: { title: string; text: string; icon?: string | null } | null = null
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
        note: remaining > 0 ? '오답이다. 다시 논의해보자.' : '기회를 모두 소진했다....... 다시 열릴 때까지 기다려야 한다.',
      }
    })
    if (clueToAdd) void addClueSync(makeClue(clueToAdd, '강당'))
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
    if (clueToAdd) void addClueSync(makeClue(clueToAdd, '강당'))
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

  function sendBroadcast(kind: BroadcastKind, title: string, body: string, postToFeed = true) {
    if (!title.trim() || !body.trim()) return
    const id = `bc-${Date.now()}`
    const bc: Broadcast = { id, kind, title: title.trim(), body: body.trim() }
    void sendBroadcastSync(bc)
    if (!postToFeed) return
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

  function clearBroadcastForAll() {
    if (!isAdminFlag) return
    void patchSession({ broadcast: null })
  }

  function setNotifyRoomEvents(on: boolean) {
    localStorage.setItem(LS.notifyRoomEvents, String(on))
    setNotifyRoomEventsLocal(on)
  }

  function setNotifyGeneralBroadcasts(on: boolean) {
    localStorage.setItem(LS.notifyGeneralBroadcasts, String(on))
    setNotifyGeneralBroadcastsLocal(on)
  }

  function enableAllNotifications() {
    setNotifyRoomEvents(true)
    setNotifyGeneralBroadcasts(true)
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

  function setShopOpen(open: boolean) {
    if (!isAdminFlag) return
    void patchSession({ shopOpen: open })
  }

  function assignRoleManually(characterId: string, nickname: string) {
    if (!isAdminFlag || !nickname.trim()) return
    void assignRoleManuallySync(characterId, nickname)
  }

  function resetAllData() {
    if (!isAdminFlag) return
    void resetAllDataSync()
  }

  function revealStoryDay(day: 1 | 2 | 3 | 4) {
    if (!isAdminFlag) return
    void revealStoryDaySync(day)
  }

  function revealTruth() {
    if (!isAdminFlag) return
    void revealTruthSync()
  }

  function sendEnding(key: EndingKey) {
    if (!isAdminFlag) return
    void sendEndingSync(key)
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
      const teamLabel = (team: 'ward' | 'sin') => (team === 'ward' ? '학생' : '괴이')
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
      const check = resolveTeamCheckPure(sess.disguiseArmed, targetId)
      const resultText = `《학생부 조사》 ${displayName(targetId)} — 실패 카드를 ${check.team === 'sin' ? '낼 수 있다' : '낼 수 없다'}.`
      return {
        session: check.disguiseArmed !== sess.disguiseArmed ? { disguiseArmed: check.disguiseArmed } : undefined,
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          personalClues: [...player.personalClues, resultText],
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(resultText)],
        },
      }
    })
  }

  function armShield() {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('보호자')) return {}
      if (sess.mission.shielded) return {}
      const text = '《수호》를 발동했다 — 다음 조사 결과에서 실패 카드 1 장이 무효화된다.'
      return {
        session: { mission: { ...sess.mission, shielded: true } },
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
      const text = `《CCTV》 ${missionIndex + 1} 차 조사 — 실패 카드 ${count} 장.`
      return {
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          personalClues: [...player.personalClues, text],
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(text)],
        },
      }
    })
  }

  function discern(targetId: string) {
    if (!viewerId || targetId === viewerId) return
    void runCombatTransaction(
      viewerId,
      () => targetId,
      (_sess, me, target) => {
        if (!me.abilityUnlocked || me.abilityUseCount >= abilityMax('괴이의 사도')) return {}
        const today = new Date().toISOString().slice(0, 10)
        if (me.lastDiscernDate === today) return {}
        if (!target) return {}
        const targetChar = CHARACTERS.find((c) => c.id === targetId)!
        const text = `《분별》 ${displayName(targetId)}의 능력 — ${targetChar.abilityName} (지금까지 ${target.abilityUseCount} 회 발동).`
        return {
          me: {
            abilityUseCount: me.abilityUseCount + 1,
            lastDiscernDate: today,
            personalClues: [...me.personalClues, text],
            gmDmMessages: [...me.gmDmMessages, makeGmDmMsg(text)],
          },
        }
      },
    )
  }

  function forgeResult() {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('파괴자')) return {}
      if (!sess.mission.proposedTeam.includes(viewerId)) return {}
      if (sess.mission.missionResults[sess.mission.missionIndex] !== 'success') return {}
      const nextMission = missionReducer(sess.mission, { type: 'FORGE_RESULT' })
      const text = `《파괴》 ${sess.mission.missionIndex + 1} 차 조사의 결과를 몰래 조작했다.`
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
      const target = CHARACTERS.find((c) => c.id === targetId)!
      const check = resolveTeamCheckPure(sess.disguiseArmed, targetId)
      const trueRoleLabel =
        check.team === target.team ? target.role : check.team === 'ward' ? '학생(위장 감지)' : '괴이'
      const resultText = `《투시》 ${displayName(targetId)}의 진짜 정체 — ${trueRoleLabel}.`
      return {
        session: check.disguiseArmed !== sess.disguiseArmed ? { disguiseArmed: check.disguiseArmed } : undefined,
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
        const roll = rollDice()
        const hit = roll > DICE_SUCCESS_THRESHOLD
        const damage = hit ? myAtk : 0
        const newCreatureHp = Math.max(0, combat.creatureHp - damage)
        const defeated = newCreatureHp <= 0

        const log: CombatLogEntry[] = [...combat.log]
        log.push(
          makeCombatLog(
            hit
              ? `${displayName(myId)}이(가) ${creature.name}을(를) 공격했다....... 주사위 10 개 합계 ${roll} — 명중! ${damage}의 피해를 입혔다.`
              : `${displayName(myId)}이(가) ${creature.name}을(를) 공격했다....... 주사위 10 개 합계 ${roll} — 빗나갔다.`,
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
          const rollC = rollDice()
          const hitC = rollC > DICE_SUCCESS_THRESHOLD
          const dmgC = hitC ? Math.max(1, creature.atk - Math.floor(defenderDef / 2)) : 0
          const defenderName = retaliateAgainstSelf ? displayName(myId) : displayName(targetId!)
          log.push(
            makeCombatLog(
              hitC
                ? `${creature.name}이(가) ${defenderName}을(를) 향해 반격했다....... 주사위 10 개 합계 ${rollC} — 명중! ${dmgC}의 피해를 입었다.`
                : `${creature.name}이(가) ${defenderName}을(를) 향해 반격했다....... 주사위 10 개 합계 ${rollC} — 빗나갔다.`,
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
        const inventory = { ...(me.inventory ?? {}) }
        inventory[itemId] = (inventory[itemId] ?? 0) + 1
        return { me: { coins: me.coins - item.price, inventory } }
      },
    )
  }

  function useItem(itemId: string) {
    if (!viewerId) return
    const item = shopItemById(itemId)
    if (!item) return
    void runCombatTransaction(
      viewerId,
      () => null,
      (_sess, me) => {
        const owned = me.inventory?.[itemId] ?? 0
        if (owned <= 0) return {}
        const inventory = { ...(me.inventory ?? {}) }
        inventory[itemId] = owned - 1
        return { me: { inventory, ...applyItemEffect(item, me) } }
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
        const inventory = { ...(target.inventory ?? {}) }
        inventory[itemId] = (inventory[itemId] ?? 0) + 1
        return {
          me: { coins: me.coins - item.price },
          target: { inventory },
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
      accountUsername,
      register,
      login,
      loginAsAdmin,
      registerAdmin,
      loginAdmin,
      logout,
      profileComplete,
      completeProfile,
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
      resetAllData,
      shopOpen: session.shopOpen,
      setShopOpen,
      storyDay: session.storyDay,
      revealStoryDay,
      truthRevealed: session.truthRevealed,
      revealTruth,
      endingKey: session.endingKey,
      sendEnding,
      gmReveal: isAdmin,
      broadcast,
      sendBroadcast,
      dismissBroadcast,
      clearBroadcastForAll,
      notifyRoomEvents,
      setNotifyRoomEvents,
      notifyGeneralBroadcasts,
      setNotifyGeneralBroadcasts,
      enableAllNotifications,
      topAlert,
      dismissTopAlert,
      hasUnreadDm,
      markDmRead,
      markDmThreadRead,
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
      armShield,
      checkCctv,
      discern,
      usedDiscernToday,
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
      useItem,
      giftItem,
      inventory,
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
      usedDiscernToday,
      personalClues,
      forgottenIdentity,
      hp,
      stamina,
      coins,
      atk,
      def,
      incapacitated,
      inventory,
      players,
      myPlayer,
      notifyRoomEvents,
      notifyGeneralBroadcasts,
      topAlert,
      hasUnreadDm,
      lastSeenDmCount,
      gmDmSeenCounts,
      accountUsername,
      profileComplete,
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
