import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ABILITY_MAX_USES,
  ABILITY_SUMMARY,
  CARD_ROOMS,
  CHARACTERS,
  ENDING_LABELS,
  ENDING_SCRIPTS,
  ROOMS,
  TEAM_LABEL,
  leakerRevealText,
} from '../data/characters'
import { CARD_ROOM_CAPACITY, CARD_ROOM_MIN_PLAYERS, CARD_TURN_TIME_LIMIT_MS } from '../data/cardGame'
import { creatureById } from '../data/creatures'
import { shopItemById } from '../data/shop'
import { hallEventById } from '../data/hallEvents'
import { hallwayInvestigationByRoom } from '../data/hallwayInvestigations'
import { hallPuzzleById } from '../data/hallPuzzles'
import { MINIGAME_OPTIONS } from '../data/hallMinigames'
import type {
  BaseballGameState,
  Broadcast,
  BroadcastKind,
  CardGameState,
  CardPile,
  CardRoomId,
  ChatMessage,
  ClassroomPuzzle,
  ClassroomState,
  CombatLogEntry,
  Creature,
  DavinciGameState,
  EndingKey,
  EventLibraryItem,
  FeedComment,
  FeedPost,
  HallEventState,
  HallGameState,
  HallMinigameKind,
  HallObjectResult,
  RoomEventState,
  RoomId,
} from '../data/types'
import { initialMissionState, missionReducer, resolvedTeam, type MissionState } from './missionEngine'
import { firebaseConfigured } from '../firebase'
import {
  addClueSync,
  addCommentSync,
  assignRoleManuallySync,
  loginAccountSync,
  registerAccountSync,
  createFeedPostSync,
  defaultSessionState,
  deleteCommentSync,
  deleteFeedPostSync,
  editCommentSync,
  editFeedPostSync,
  ensureSessionInitialized,
  feedPostToFeedPost,
  endCardTurnSync,
  forceCloseRoomSync,
  grantCoinsSync,
  joinCardRoomSync,
  joinRoomSync,
  leaveCardRoomSync,
  leaveRoomSync,
  openMissionsSync,
  patchPlayer,
  playCardSync,
  forceEndCardTurnSync,
  resetCardGameSync,
  startCardGameSync,
  patchSession,
  resetAllDataSync,
  revealStoryDaySync,
  revealTruthSync,
  sendEndingSync,
  runAbilityTransaction,
  runCombatTransaction,
  runHallMinigameTransaction,
  runRoomCombatTransaction,
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
  publishLeakSync,
  type AbilityLogEntry,
  type ClueItem,
  type FeedPostDoc,
  type LeakEntry,
  type PlayerDoc,
  type SessionDoc,
} from './sync'

const ATTACK_STAMINA_COST = 4
const BASE_ATK = 5
const DICE_COUNT = 3
const ROOM_DEFEAT_EVICT_MIN = 5
const ROOM_DEFEAT_EVICT_MS = ROOM_DEFEAT_EVICT_MIN * 60 * 1000
const DICE_SUCCESS_THRESHOLD = 11

// 기존(스키마 변경 이전) 세션 문서에는 roomEvents[room].investigation 필드가 없을 수
// 있으므로, 구독해서 받은 데이터를 그대로 쓰기 전에 누락된 필드를 기본값으로 채운다.
function normalizeSession(data: SessionDoc): SessionDoc {
  const roomEvents = { ...data.roomEvents }
  for (const roomId of Object.keys(roomEvents) as RoomId[]) {
    if (!roomEvents[roomId].investigation) {
      roomEvents[roomId] = {
        ...roomEvents[roomId],
        investigation: { started: false, logIndex: 0, completed: false },
      }
    }
  }
  return { ...data, roomEvents }
}

// 전투 중 실제로 차례를 진행할 수 있는 사람을 계산한다. 저장된 차례가 이미 방을 나갔거나
// 빈사(HP 0) 상태라면 (방에 남아 움직일 수 있는 사람 중) 맨 앞 사람으로 자연스럽게 넘어간다.
function effectiveTurnPlayerId(
  occupants: string[],
  turnPlayerId: string | null,
  isEligible: (id: string) => boolean,
): string | null {
  if (turnPlayerId && occupants.includes(turnPlayerId) && isEligible(turnPlayerId)) return turnPlayerId
  return occupants.find((id) => isEligible(id)) ?? null
}

// 현재 차례 다음으로, 빈사 상태가 아닌 사람에게 차례를 넘긴다.
function advanceTurnPlayerId(
  occupants: string[],
  fromId: string,
  isEligible: (id: string) => boolean,
): string | null {
  const idx = occupants.indexOf(fromId)
  if (idx === -1) return occupants.find((id) => isEligible(id)) ?? null
  for (let i = 1; i <= occupants.length; i++) {
    const candidate = occupants[(idx + i) % occupants.length]
    if (isEligible(candidate)) return candidate
  }
  return null
}

// TRPG 전투 판정: 주사위(1d6) 3 개를 굴려 합이 11 이상이면 성공.
function rollDice(): { values: number[]; sum: number; hit: boolean } {
  const values = Array.from({ length: DICE_COUNT }, () => 1 + Math.floor(Math.random() * 6))
  const sum = values.reduce((a, b) => a + b, 0)
  return { values, sum, hit: sum >= DICE_SUCCESS_THRESHOLD }
}

function describeDiceRoll(roll: { values: number[]; sum: number; hit: boolean }): string {
  return `주사위 ${roll.values.join(', ')} → 합계 ${roll.sum} (기준 ${DICE_SUCCESS_THRESHOLD} 이상 성공)`
}

function makeCombatLog(text: string): CombatLogEntry {
  return { id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text }
}

// 강당 미니게임: 참여자는 참여할 때 직접 선택지를 고른다(홀/짝, 하이/로우, 오버/언더).
// 불가가 게임을 진행시키면 실제 결과가 하나 뽑히고, 자신의 선택과 일치한 사람만 이긴다.
function buildMinigameLog(kind: HallMinigameKind | undefined, label: string, outcomeLabel: string): string {
  if (kind === 'oddeven') {
    return `${label} 앞에서 그것과 홀짝을 걸었다....... 펼쳐 보니 결과는 '${outcomeLabel}'.`
  }
  if (kind === 'poker') {
    return `${label} 앞에서 그것과 패를 나눴다....... 결과는 '${outcomeLabel}'.`
  }
  return `${label}에서 그것과 승부가 갈렸다....... 결과는 '${outcomeLabel}'.`
}

// 로보 77: 숫자 카드 세 장을 실제로 뽑아 합산한 뒤 77과 비교해 오버/언더를 가른다
// (다른 미니게임과 달리 결과만 통보하지 않고 뽑힌 숫자를 그대로 로그에 남긴다).
function rollRobo77(): { draws: number[]; sum: number; outcomeId: 'over' | 'under' } {
  const draws = [1, 2, 3].map(() => 15 + Math.floor(Math.random() * 21))
  const sum = draws.reduce((a, b) => a + b, 0)
  return { draws, sum, outcomeId: sum > 77 ? 'over' : 'under' }
}

// 숫자 야구: 서로 다른 숫자 3 개로 이루어진 정답을 그것이 정해 두면, 플레이어가 직접 여러 번에
// 걸쳐 추리해 맞혀야 한다(스트라이크/볼로 힌트를 준다).
function generateBaseballSecret(): string {
  const pool = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  let secret = ''
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    secret += pool[idx]
    pool.splice(idx, 1)
  }
  return secret
}

function scoreBaseball(secret: string, guess: string): { strikes: number; balls: number } {
  let strikes = 0
  let balls = 0
  for (let i = 0; i < 3; i++) {
    if (guess[i] === secret[i]) strikes++
    else if (secret.includes(guess[i])) balls++
  }
  return { strikes, balls }
}

// 다빈치코드: 그것이 0~11 중 서로 다른 숫자 4 개를 오름차순으로 늘어놓는다.
// 플레이어는 자리마다 숫자를 추리해 맞혀야 하며, 틀리면 그 숫자가 정답보다 큰지 작은지 알려준다.
function generateDavinciTiles(): number[] {
  const pool = Array.from({ length: 12 }, (_, i) => i)
  const picked: number[] = []
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool[idx])
    pool.splice(idx, 1)
  }
  return picked.sort((a, b) => a - b)
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

// 무기/방어구는 인벤토리를 거치지 않고 구매·선물 즉시 장착되어 기존 장비를 대체한다.
function equipPatch(itemId: string, item: { kind: 'weapon' | 'armor' | 'food' | 'medicine'; amount: number }): Partial<PlayerDoc> | null {
  if (item.kind === 'weapon') return { weaponAtkBonus: item.amount, equippedWeaponId: itemId }
  if (item.kind === 'armor') return { armorDefBonus: item.amount, equippedArmorId: itemId }
  return null
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
  notifyPushEnabled: 'gwae_notifyPushEnabled',
  lastSeenDmCount: 'gwae_lastSeenDmCount',
  gmDmSeenCounts: 'gwae_gmDmSeenCounts',
  roomMsgSeenCounts: 'gwae_roomMsgSeenCounts',
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
  kickFromRoom: (roomId: RoomId, targetId: string) => void
  roomMessages: Record<RoomId, ChatMessage[]>
  sendRoomMessage: (roomId: RoomId, text: string) => void
  hasUnreadRoom: (roomId: RoomId) => boolean
  hasUnreadAnyRoom: boolean
  markRoomRead: (roomId: RoomId) => void
  roomEvents: Record<RoomId, RoomEventState>
  cardGames: Record<CardRoomId, CardGameState | null>
  joinCardRoom: (roomId: CardRoomId) => void
  startCardGame: (roomId: CardRoomId) => void
  leaveCardRoom: (roomId: CardRoomId) => void
  kickFromCardRoom: (roomId: CardRoomId, targetId: string) => void
  playCard: (roomId: CardRoomId, pile: CardPile, card: number) => void
  endCardTurn: (roomId: CardRoomId) => void
  resetCardGame: (roomId: CardRoomId) => void
  closeRoomInvestigation: (roomId: RoomId) => void
  setRoomOpen: (roomId: RoomId, open: boolean) => void
  startHallwayInvestigation: (roomId: RoomId) => void
  advanceHallwayInvestigationLog: (roomId: RoomId) => void
  finishHallwayInvestigation: (roomId: RoomId) => void
  classroomMessages: ChatMessage[]
  sendClassroomMessage: (text: string) => void
  classroom: ClassroomState
  dispatchClassroomEvent: (item: EventLibraryItem) => void
  dispatchPuzzle: (puzzle: ClassroomPuzzle) => void
  submitPuzzleAnswer: (text: string) => void
  closeInvestigation: () => void
  attemptDuel: (choice: 'odd' | 'even') => void
  hallEvent: HallEventState
  dispatchHallEvent: (eventId: string) => void
  addHallEventTime: () => void
  advanceHallLog: () => void
  voteHallLogChoice: (choiceId: string) => void
  closeHallLogVote: () => void
  advanceHallObject: () => void
  finishHallEvent: () => void
  resolveHallObject: (objectId: string, choice: 'open' | 'leave') => void
  submitHallPuzzleAnswer: (objectId: string, text: string) => void
  joinHallMinigame: (objectId: string, choiceId: string) => void
  resolveHallMinigame: (objectId: string) => void
  startHallGame: (objectId: string) => void
  submitBaseballGuess: (objectId: string, guess: string) => void
  submitDavinciGuess: (objectId: string, position: number, guessValue: number) => void
  feed: FeedPost[]
  toggleHeart: (postId: string) => void
  gmReveal: boolean
  broadcast: Broadcast | null
  sendBroadcast: (
    kind: BroadcastKind,
    title: string,
    body: string,
    variant?: string,
    footer?: string,
  ) => void
  dismissBroadcast: () => void
  clearBroadcastForAll: () => void
  notifyRoomEvents: boolean
  setNotifyRoomEvents: (on: boolean) => void
  notifyGeneralBroadcasts: boolean
  setNotifyGeneralBroadcasts: (on: boolean) => void
  enableAllNotifications: () => void
  notifPermission: NotificationPermission | 'unsupported'
  requestBrowserNotifications: () => void
  notifyPushEnabled: boolean
  toggleBrowserNotifications: () => void
  topAlert: { id: string; text: string } | null
  dismissTopAlert: () => void
  hasUnreadDm: boolean
  markDmRead: () => void
  markDmThreadRead: (characterId: string) => void
  missionsOpen: boolean
  openMissions: (firstPlayerId?: string) => void
  setMissionsOpen: (open: boolean) => void
  mission: MissionState
  setDraftPreview: (team: string[]) => void
  confirmProposal: (team: string[]) => void
  castVote: (approve: boolean) => void
  closeVote: () => void
  submitCard: (card: 'success' | 'fail') => void
  closeExecute: () => void
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
  usedRecordBookToday: boolean
  forgeResult: () => void
  revengerCheck: (targetId: string) => void
  armDisguise: () => void
  disguiseArmed: boolean
  disguiseArmedUntilMs: number | null
  leakLog: LeakEntry[]
  leakUnlocked: boolean
  investigateLeak: (targetId: string) => void
  publishLeak: (leakId: string) => void
  leakRevealPending: boolean
  dismissLeakReveal: () => void
  hp: number
  stamina: number
  coins: number
  atk: number
  def: number
  equippedWeaponId: string | null
  equippedArmorId: string | null
  incapacitated: boolean
  attackCreature: (roomId: RoomId) => void
  defendInCombat: (roomId: RoomId) => void
  dispatchCreature: (roomId: RoomId, creature: Creature) => void
  buyItem: (itemId: string) => void
  useItem: (itemId: string) => void
  giftItem: (itemId: string, targetId: string) => void
  inventory: Record<string, number>
  createFeedPost: (title: string, body: string, commentsEnabled: boolean) => void
  editFeedPost: (postId: string, title: string, body: string) => void
  deleteFeedPost: (postId: string) => void
  toggleCommentsEnabled: (postId: string) => void
  addComment: (postId: string, text: string, secret: boolean) => void
  editComment: (postId: string, commentId: string, text: string) => void
  deleteComment: (postId: string, commentId: string) => void
  players: Record<string, PlayerDoc>
  gmDmMessages: ChatMessage[]
  sendGmDm: (text: string) => void
  sendGmDmAsAdmin: (characterId: string, text: string) => void
  collectedClues: ClueItem[]
  abilityLog: AbilityLogEntry[]
  missionMessages: ChatMessage[]
  sendMissionMessage: (text: string) => void
  discussionOpen: boolean
  discussionOpenedAt: number | null
  setDiscussionOpen: (open: boolean) => void
  assignRoleManually: (characterId: string, nickname: string) => void
  grantCoins: (characterId: string, amount: number) => void
  resetAllData: () => void
  shopOpen: boolean
  setShopOpen: (open: boolean) => void
  classroomOpen: boolean
  setClassroomOpen: (open: boolean) => void
  abilitiesOpen: boolean
  setAbilitiesOpen: (open: boolean) => void
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

function makeClue(
  data: { title: string; text: string; icon?: string | null; emphasize?: boolean },
  source: string,
): ClueItem {
  return {
    id: `clue-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: data.title,
    text: data.text,
    source,
    icon: data.icon ?? null,
    ...(data.emphasize ? { emphasize: true } : {}),
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

function makeAbilityLogEntry(
  characterId: string,
  abilityName: string,
  resultText: string,
  targetCharacterIds: string[] = [],
): AbilityLogEntry {
  return {
    id: `al-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    characterId,
    abilityName,
    resultText,
    targetCharacterIds,
    atMs: Date.now(),
  }
}

const DISGUISE_DURATION_MS = 6 * 60 * 60 * 1000

function resolveTeamCheckPure(disguiseArmedUntilMs: number | null, targetId: string): { team: 'ward' | 'sin' } {
  const target = CHARACTERS.find((c) => c.id === targetId)!
  const disguised = !!disguiseArmedUntilMs && Date.now() < disguiseArmedUntilMs
  if (target.role === '잠입자' && disguised) {
    return { team: 'ward' }
  }
  return { team: target.team === 'ward' ? 'ward' : 'sin' }
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
  const [notifyPushEnabled, setNotifyPushEnabledLocal] = useState<boolean>(
    () => localStorage.getItem(LS.notifyPushEnabled) !== 'false',
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
  const [roomMsgSeenCounts, setRoomMsgSeenCountsLocal] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS.roomMsgSeenCounts) ?? '{}')
    } catch {
      return {}
    }
  })
  const [topAlert, setTopAlert] = useState<{ id: string; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('main')
  const [session, setSession] = useState<SessionDoc>(defaultSessionState)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [players, setPlayers] = useState<Record<string, PlayerDoc>>({})
  const [playersLoaded, setPlayersLoaded] = useState(false)
  const [feedDocs, setFeedDocs] = useState<(FeedPostDoc & { id: string })[]>([])
  const [feedLoaded, setFeedLoaded] = useState(false)

  useEffect(() => {
    ensureSessionInitialized().catch(() => {})
    const unsubSession = subscribeSession((data) => {
      setSession(normalizeSession({ ...defaultSessionState(), ...data }))
      setSessionLoaded(true)
    })
    const unsubPlayers = subscribeAllPlayers((p) => {
      setPlayers(p)
      setPlayersLoaded(true)
    })
    const unsubFeed = subscribeFeed((docs) => {
      setFeedDocs(docs)
      setFeedLoaded(true)
    })
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
  const usedRecordBookToday = myPlayer?.lastRecordBookDate === new Date().toISOString().slice(0, 10)
  const viewerRole = viewerId ? CHARACTERS.find((c) => c.id === viewerId)?.role : undefined
  const abilityMaxUses = viewerRole ? ABILITY_MAX_USES[viewerRole] ?? 1 : 1
  const personalClues = myPlayer?.personalClues ?? []
  const hp = myPlayer?.hp ?? 100
  const stamina = myPlayer?.stamina ?? 100
  const coins = myPlayer?.coins ?? 0
  const inventory = myPlayer?.inventory ?? {}
  const atk = BASE_ATK + (myPlayer?.weaponAtkBonus ?? 0)
  const def = myPlayer?.armorDefBonus ?? 0
  const equippedWeaponId = myPlayer?.equippedWeaponId ?? null
  const equippedArmorId = myPlayer?.equippedArmorId ?? null
  const incapacitated = hp <= 0 || stamina <= 0

  // 앱이 백그라운드(다른 탭/다른 앱)에 있을 때도 카카오톡처럼 브라우저 알림을 띄운다.
  // 탭하면 이 앱으로 돌아와 관련 탭으로 이동한다. 서비스 워커가 등록되어 있고
  // 알림 권한이 허용된 경우에만 동작하며, 브라우저가 완전히 꺼진 상태에서는
  // (전용 푸시 서버가 없으므로) 동작하지 않는다.
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'gwae-notification-nav' && event.data.tab) {
        setActiveTab(event.data.tab as TabId)
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  function requestBrowserNotifications() {
    if (typeof Notification === 'undefined') return
    void Notification.requestPermission().then((perm) => {
      setNotifPermission(perm)
      if (perm === 'granted') {
        setNotifyPushEnabledLocal(true)
        localStorage.setItem(LS.notifyPushEnabled, 'true')
      }
    })
  }

  // 브라우저 알림 권한 자체는 JS로 되돌릴 수 없어서(허용은 요청할 수 있어도 취소는 브라우저
  // 설정에서만 가능), 앱 안에서 껐다 켰다 할 수 있도록 별도의 로컬 스위치를 둔다. 권한은 이미
  // 허용된 채로 두고, 이 스위치가 꺼져 있으면 notifyBackground가 알림을 그냥 띄우지 않는다.
  function toggleBrowserNotifications() {
    setNotifyPushEnabledLocal((prev) => {
      const next = !prev
      localStorage.setItem(LS.notifyPushEnabled, String(next))
      return next
    })
  }

  function notifyBackground(title: string, body: string, tab: TabId) {
    if (notifPermission !== 'granted') return
    if (!notifyPushEnabled) return
    if (typeof document !== 'undefined' && !document.hidden) return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    void navigator.serviceWorker.ready.then((reg) => {
      void reg.showNotification(title, { body, tag: 'gwae-alert', data: { tab } })
    })
  }

  // 새 공지·괴이 출현이 뜨면 (알림 설정을 켜둔 경우) 상단바에도 짧게 알려 준다.
  const lastAlertedBroadcastIdRef = useRef<string | null>(null)
  useEffect(() => {
    const bc = session.broadcast
    if (!bc || bc.id === lastAlertedBroadcastIdRef.current) return
    lastAlertedBroadcastIdRef.current = bc.id
    const suppressed = bc.kind === 'sin' ? !notifyRoomEvents : !notifyGeneralBroadcasts
    if (suppressed) return
    setTopAlert({ id: bc.id, text: bc.title })
    const tab: TabId = bc.kind === 'sin' ? 'rooms' : bc.kind === 'event' ? 'classroom' : 'main'
    notifyBackground(bc.title, bc.body, tab)
  }, [session.broadcast, notifyRoomEvents, notifyGeneralBroadcasts])

  // 불가가 나에게 새 쪽지를 보내면 상단바에 알려 준다 (최초 로딩 시점의 기존 대화는 제외).
  const dmInitRef = useRef(false)
  const lastDmCountRef = useRef(0)
  useEffect(() => {
    if (!viewerId || isAdminFlag || !playersLoaded) return
    const msgs = myPlayer?.gmDmMessages ?? []
    if (!dmInitRef.current) {
      dmInitRef.current = true
      lastDmCountRef.current = msgs.length
      return
    }
    if (msgs.length > lastDmCountRef.current) {
      const last = msgs[msgs.length - 1]
      if (last.authorId === 'admin') {
        setTopAlert({ id: last.id, text: `??: ${last.text}` })
        notifyBackground('??', last.text, 'profile')
      }
    }
    lastDmCountRef.current = msgs.length
  }, [myPlayer?.gmDmMessages, viewerId, isAdminFlag, playersLoaded])

  // 불가 화면에서는 누구든 새로 보낸 쪽지가 오면 상단바에 알려 준다.
  const gmDmInitRef = useRef(false)
  const lastGmInboxTotalRef = useRef(0)
  useEffect(() => {
    if (!isAdminFlag || !playersLoaded) return
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
      notifyBackground(senderName, latestMsg.text, 'profile')
    }
    lastGmInboxTotalRef.current = total
  }, [players, isAdminFlag, playersLoaded])

  // 구관에서 크리처를 쓰러뜨린 뒤 유예 시간(ROOM_DEFEAT_EVICT_MS)이 지나면, 누군가의 화면이든
  // 켜져 있는 클라이언트가 대신 방을 비우고 조사 상태를 초기화한다(멱등적이라 여러 클라이언트가
  // 동시에 감지해도 문제없다).
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now()
      for (const room of ROOMS) {
        const combat = session.roomEvents[room.id]?.combat
        if (combat?.defeated && combat.defeatedAtMs && now - combat.defeatedAtMs >= ROOM_DEFEAT_EVICT_MS) {
          void forceCloseRoomSync(room.id)
        }
      }
    }, 5000)
    return () => clearInterval(t)
  }, [session.roomEvents])

  // 카드 게임 차례 제한 시간(3 분)이 지나면, 누군가의 화면이든 켜져 있는 클라이언트가
  // 대신 그 차례를 강제로 넘긴다(멱등적이라 여러 클라이언트가 동시에 감지해도 문제없다).
  useEffect(() => {
    const t = setInterval(() => {
      for (const room of CARD_ROOMS) {
        const game = session.cardGames[room.id]
        if (game && game.status === 'playing' && Date.now() - game.turnStartedAtMs >= CARD_TURN_TIME_LIMIT_MS) {
          void forceEndCardTurnSync(room.id)
        }
      }
    }, 10000)
    return () => clearInterval(t)
  }, [session.cardGames])

  // 강당 채팅에 새 메시지가 오면 (내가 보낸 게 아니면) 상단바 + 백그라운드 알림을 띄운다.
  // 나를 태그(@닉네임)한 메시지는 더 눈에 띄게 표시한다.
  const classroomMsgInitRef = useRef(false)
  const lastClassroomCountRef = useRef(0)
  useEffect(() => {
    if (!sessionLoaded) return
    const msgs = session.classroomMessages
    if (!classroomMsgInitRef.current) {
      classroomMsgInitRef.current = true
      lastClassroomCountRef.current = msgs.length
      return
    }
    if (msgs.length > lastClassroomCountRef.current) {
      const last = msgs[msgs.length - 1]
      const isMine = isAdminFlag ? last.authorId === 'admin' : !!viewerId && last.authorId === viewerId
      if (!isMine && (viewerId || isAdminFlag)) {
        const senderName = displayName(last.authorId)
        const myName = isAdminFlag ? displayName('admin') : viewerId ? displayName(viewerId) : null
        const tagged = !!myName && last.text.includes(`@${myName}`)
        setTopAlert({ id: last.id, text: `${tagged ? '[태그] ' : ''}${senderName}: ${last.text}` })
        notifyBackground(tagged ? `${senderName}이(가) 나를 태그했다` : `강당 · ${senderName}`, last.text, 'classroom')
      }
    }
    lastClassroomCountRef.current = msgs.length
  }, [session.classroomMessages, viewerId, isAdminFlag, sessionLoaded])

  // 구관 채팅도 마찬가지로 알려 준다 — 다만 내가 있는 방이거나 나를 태그한 경우에만
  // 알림을 띄워, 들어가 있지 않은 방의 대화로 계속 알림이 오는 것을 막는다.
  const roomMsgInitRef = useRef(false)
  const lastRoomCountsRef = useRef<Record<string, number>>({})
  useEffect(() => {
    if (!sessionLoaded) return
    if (!roomMsgInitRef.current) {
      roomMsgInitRef.current = true
      for (const room of [...ROOMS, ...CARD_ROOMS]) lastRoomCountsRef.current[room.id] = session.roomMessages[room.id]?.length ?? 0
      return
    }
    for (const room of [...ROOMS, ...CARD_ROOMS]) {
      const msgs = session.roomMessages[room.id] ?? []
      const prevCount = lastRoomCountsRef.current[room.id] ?? 0
      if (msgs.length > prevCount) {
        const last = msgs[msgs.length - 1]
        const isMine = isAdminFlag ? last.authorId === 'admin' : !!viewerId && last.authorId === viewerId
        const myName = isAdminFlag ? displayName('admin') : viewerId ? displayName(viewerId) : null
        const tagged = !!myName && last.text.includes(`@${myName}`)
        const iAmHere = !!viewerId && (session.roomOccupancy[room.id] ?? []).includes(viewerId)
        if (!isMine && (isAdminFlag || iAmHere || tagged)) {
          const senderName = displayName(last.authorId)
          setTopAlert({ id: last.id, text: `${tagged ? '[태그] ' : ''}${senderName}: ${last.text}` })
          notifyBackground(
            tagged ? `${senderName}이(가) 나를 태그했다` : `${room.name} · ${senderName}`,
            last.text,
            'rooms',
          )
        }
      }
      lastRoomCountsRef.current[room.id] = msgs.length
    }
  }, [session.roomMessages, session.roomOccupancy, viewerId, isAdminFlag, sessionLoaded])

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

  function hasUnreadRoom(roomId: RoomId) {
    const count = session.roomMessages[roomId]?.length ?? 0
    return count > (roomMsgSeenCounts[roomId] ?? 0)
  }

  const hasUnreadAnyRoom = (Object.keys(session.roomMessages) as RoomId[]).some(hasUnreadRoom)

  function markRoomRead(roomId: RoomId) {
    const count = session.roomMessages[roomId]?.length ?? 0
    if ((roomMsgSeenCounts[roomId] ?? 0) === count) return
    const next = { ...roomMsgSeenCounts, [roomId]: count }
    localStorage.setItem(LS.roomMsgSeenCounts, JSON.stringify(next))
    setRoomMsgSeenCountsLocal(next)
  }

  function displayName(id: string) {
    if (id === 'admin') return '??'
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
    const finalNickname = '??'
    localStorage.setItem(LS.isAdmin, 'true')
    localStorage.setItem(LS.adminNickname, finalNickname)
    localStorage.setItem(LS.roleRevealed, 'true')
    setIsAdminFlag(true)
    setAdminNicknameLocal(finalNickname)
    setRoleRevealedLocal(true)
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

  function kickFromRoom(roomId: RoomId, targetId: string) {
    if (!isAdminFlag) return
    void leaveRoomSync(targetId, roomId)
  }

  function kickFromCardRoom(roomId: CardRoomId, targetId: string) {
    if (!isAdminFlag) return
    void leaveCardRoomSync(targetId, roomId)
  }

  function joinCardRoom(roomId: CardRoomId) {
    if (!viewerId) return
    void joinCardRoomSync(viewerId, roomId)
  }

  function startCardGame(roomId: CardRoomId) {
    if (!isAdminFlag) return
    const occ = session.roomOccupancy[roomId] ?? []
    if (occ.length < CARD_ROOM_MIN_PLAYERS || occ.length > CARD_ROOM_CAPACITY) return
    if (session.cardGames[roomId]) return
    const turnOrder = [...occ].sort((a, b) => (players[a]?.nickname ?? '').localeCompare(players[b]?.nickname ?? '', 'ko'))
    void startCardGameSync(roomId, turnOrder)
  }

  function leaveCardRoom(roomId: CardRoomId) {
    if (!viewerId) return
    void leaveCardRoomSync(viewerId, roomId)
  }

  function playCard(roomId: CardRoomId, pile: CardPile, card: number) {
    if (!viewerId) return
    void playCardSync(viewerId, roomId, pile, card)
  }

  function endCardTurn(roomId: CardRoomId) {
    if (!viewerId) return
    void endCardTurnSync(viewerId, roomId)
  }

  function resetCardGame(roomId: CardRoomId) {
    if (!isAdminFlag) return
    void resetCardGameSync(roomId)
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
    void updateRoomEventSync(roomId, (state) => ({
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
      combat: {
        creatureId: creature.id,
        creatureHp: creature.hp,
        log: [],
        defeated: false,
        defeatedAtMs: null,
        turnPlayerId: null,
        defenderId: null,
      },
      open: state.open,
      investigation: state.investigation,
    }))
    const room = ROOMS.find((r) => r.id === roomId)!
    sendBroadcast('sin', `${room.name}에서 무언가 나타났다`, `${creature.intro} — 지금 바로 ${room.name}으로 가 보자.......`)
  }

  function closeRoomInvestigation(roomId: RoomId) {
    void updateRoomEventSync(roomId, (state) => ({
      event: null,
      cleared: false,
      clue: null,
      note: null,
      combat: null,
      open: state.open,
      investigation: state.investigation,
    }))
  }

  function setRoomOpen(roomId: RoomId, open: boolean) {
    if (!isAdminFlag) return
    void updateRoomEventSync(roomId, (state) => ({ ...state, open }))
    const room = ROOMS.find((r) => r.id === roomId) ?? CARD_ROOMS.find((r) => r.id === roomId)
    if (open && room) {
      sendBroadcast('event', `${room.name} 개방`, `${room.name}이(가) 열렸다....... 지금 입장할 수 있다.`)
    }
  }

  function startHallwayInvestigation(roomId: RoomId) {
    if (!isAdminFlag) return
    const investigation = hallwayInvestigationByRoom(roomId)
    if (!investigation) return
    void updateRoomEventSync(roomId, (state) => {
      if (state.investigation.started) return state
      return { ...state, investigation: { started: true, logIndex: 0, completed: false } }
    })
  }

  function advanceHallwayInvestigationLog(roomId: RoomId) {
    if (!isAdminFlag) return
    const investigation = hallwayInvestigationByRoom(roomId)
    if (!investigation) return
    void updateRoomEventSync(roomId, (state) => {
      if (!state.investigation.started || state.investigation.completed) return state
      const nextLogIndex = Math.min(state.investigation.logIndex + 1, investigation.logs.length)
      return { ...state, investigation: { ...state.investigation, logIndex: nextLogIndex } }
    })
  }

  function finishHallwayInvestigation(roomId: RoomId) {
    if (!isAdminFlag) return
    const investigation = hallwayInvestigationByRoom(roomId)
    if (!investigation) return
    const room = ROOMS.find((r) => r.id === roomId)!
    const paperText = investigation.revealRoles
      .map((role) => {
        const character = CHARACTERS.find((c) => c.role === role)
        return character ? `${role} — ${character.abilityName}\n${character.abilityDescription}` : role
      })
      .join('\n\n')
    const clueMsg: ChatMessage = {
      id: `room-${Date.now()}-clue`,
      authorId: 'admin',
      text: `【최종 단서】 ${paperText}`,
      time: '지금',
    }
    void sendRoomMessageSync(roomId, clueMsg)
    void addClueSync(makeClue({ title: `${room.name} 조사 결과`, text: paperText }, '구관'))
    void updateRoomEventSync(roomId, (state) => {
      if (!state.investigation.started || state.investigation.completed) return state
      return { ...state, investigation: { ...state.investigation, completed: true } }
    })
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
    sendBroadcast('event', '강당이 열렸다', `《${item.title}》 — 지금 강당으로 모이자.......`)
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
    sendBroadcast('event', '강당이 열렸다', `《${puzzle.title}》 — 지금 강당으로 모이자.......`)
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

  function dispatchHallEvent(eventId: string) {
    if (!isAdminFlag) return
    const event = hallEventById(eventId)
    if (!event) return
    const nextHallEvent: HallEventState = {
      eventId,
      logIndex: 0,
      objectIndex: 0,
      objectResults: {},
      startedAtMs: Date.now(),
      completedEventIds: session.hallEvent.completedEventIds,
      logVotes: {},
      logResolutions: {},
      extraTimeMs: 0,
    }
    void patchSession({ hallEvent: nextHallEvent })
    void sendClassroomMessageSync({
      id: `he-${Date.now()}-start`,
      authorId: 'admin',
      text: `【조사 시작】 ${event.roomName} — ${event.creatureName}`,
      time: '지금',
    })
    sendBroadcast('event', `${event.roomName}이(가) 열렸다`, `${event.creatureName} — 지금 강당으로 모이자.......`)
  }

  function addHallEventTime() {
    if (!isAdminFlag) return
    if (!session.hallEvent.eventId) return
    void patchSession({
      hallEvent: { ...session.hallEvent, extraTimeMs: session.hallEvent.extraTimeMs + 10 * 60 * 1000 },
    })
  }

  function advanceHallLog() {
    if (!isAdminFlag) return
    const he = session.hallEvent
    const event = hallEventById(he.eventId ?? '')
    if (!event) return
    if (he.logIndex > 0) {
      const lastEntry = event.logs[he.logIndex - 1]
      if (lastEntry?.choices && !he.logResolutions[String(he.logIndex - 1)]) return
    }
    const nextLogIndex = Math.min(he.logIndex + 1, event.logs.length)
    void patchSession({ hallEvent: { ...he, logIndex: nextLogIndex, logVotes: {} } })
    const revealedEntry = event.logs[he.logIndex]
    if (revealedEntry) {
      void sendClassroomMessageSync({
        id: `he-${Date.now()}-log${he.logIndex}`,
        authorId: 'admin',
        text: revealedEntry.text,
        time: '지금',
      })
    }
  }

  function voteHallLogChoice(choiceId: string) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess) => {
      const he = sess.hallEvent
      const event = hallEventById(he.eventId ?? '')
      if (!event) return {}
      const idx = he.logIndex - 1
      const entry = idx >= 0 ? event.logs[idx] : undefined
      if (!entry?.choices) return {}
      if (he.logResolutions[String(idx)]) return {}
      if (!entry.choices.some((c) => c.id === choiceId)) return {}
      return {
        session: { hallEvent: { ...he, logVotes: { ...he.logVotes, [viewerId]: choiceId } } },
      }
    })
  }

  function closeHallLogVote() {
    if (!isAdminFlag) return
    const he = session.hallEvent
    const event = hallEventById(he.eventId ?? '')
    if (!event) return
    const idx = he.logIndex - 1
    const entry = idx >= 0 ? event.logs[idx] : undefined
    if (!entry?.choices || he.logResolutions[String(idx)]) return
    const tally: Record<string, number> = {}
    Object.values(he.logVotes).forEach((cid) => {
      tally[cid] = (tally[cid] ?? 0) + 1
    })
    const maxVotes = Math.max(0, ...entry.choices.map((c) => tally[c.id] ?? 0))
    const topChoices = entry.choices.filter((c) => (tally[c.id] ?? 0) === maxVotes)
    const winner = topChoices[Math.floor(Math.random() * topChoices.length)]
    void patchSession({
      hallEvent: { ...he, logResolutions: { ...he.logResolutions, [String(idx)]: winner.id }, logVotes: {} },
    })
    void sendClassroomMessageSync({
      id: `he-${Date.now()}-vote${idx}`,
      authorId: 'admin',
      text: winner.resultText,
      time: '지금',
    })
  }

  function advanceHallObject() {
    if (!isAdminFlag) return
    const event = hallEventById(session.hallEvent.eventId ?? '')
    if (!event) return
    const nextObjectIndex = Math.min(session.hallEvent.objectIndex + 1, event.objects.length)
    void patchSession({ hallEvent: { ...session.hallEvent, objectIndex: nextObjectIndex } })
  }

  function finishHallEvent() {
    if (!isAdminFlag) return
    const event = hallEventById(session.hallEvent.eventId ?? '')
    if (!event) return
    const resolvedText = event.finalClue
      .replaceAll('{{2018}}', displayName('seungwoo'))
      .replaceAll('{{2026}}', displayName('ayoung'))
    const clueMsg: ChatMessage = {
      id: `cr-${Date.now()}-clue`,
      authorId: 'admin',
      text: `【최종 단서】 ${resolvedText}`,
      time: '지금',
      ...(event.finalClueEmphasis ? { emphasize: true } : {}),
    }
    void sendClassroomMessageSync(clueMsg)
    void addClueSync(
      makeClue(
        { title: `${event.roomName} 조사 결과`, text: resolvedText, emphasize: event.finalClueEmphasis },
        '강당',
      ),
    )
    const completedEventIds = session.hallEvent.completedEventIds.includes(event.id)
      ? session.hallEvent.completedEventIds
      : [...session.hallEvent.completedEventIds, event.id]
    void patchSession({
      hallEvent: {
        eventId: null,
        logIndex: 0,
        objectIndex: 0,
        objectResults: {},
        startedAtMs: null,
        completedEventIds,
        logVotes: {},
        logResolutions: {},
        extraTimeMs: 0,
      },
    })
  }

  function resolveHallObject(objectId: string, choice: 'open' | 'leave') {
    if (!viewerId) return
    const heNow = session.hallEvent
    const eventNow = heNow.eventId ? hallEventById(heNow.eventId) : null
    const objNow = eventNow?.objects.find((o) => o.id === objectId)
    const alreadyResolved = heNow.objectResults[objectId] && heNow.objectResults[objectId].status !== 'idle'
    void runAbilityTransaction(viewerId, (sess, player) => {
      const he = sess.hallEvent
      if (!he.eventId) return {}
      const event = hallEventById(he.eventId)
      if (!event) return {}
      const obj = event.objects.find((o) => o.id === objectId)
      if (!obj) return {}
      const existing = he.objectResults[objectId]
      if (existing && existing.status !== 'idle') return {}
      const result: HallObjectResult = {
        status: choice === 'open' ? 'opened' : 'left',
        actorId: viewerId,
        puzzleSolved: false,
        puzzleAttempts: 0,
        minigamePending: [],
        minigameChoices: {},
        minigameParticipants: {},
        minigameLog: [],
      }
      const nextObjectResults = { ...he.objectResults, [objectId]: result }
      let playerPatch: Partial<PlayerDoc> | undefined
      if (choice === 'open') {
        if (obj.kind === 'hazard') {
          playerPatch = {}
          if (obj.hpDamage) playerPatch.hp = Math.max(0, player.hp - obj.hpDamage)
          if (obj.staminaDamage) playerPatch.stamina = Math.max(0, player.stamina - obj.staminaDamage)
        } else if (obj.kind === 'item') {
          if (obj.itemCoins) {
            playerPatch = { coins: player.coins + obj.itemCoins }
          } else if (obj.itemShopId) {
            const inventory = { ...(player.inventory ?? {}) }
            inventory[obj.itemShopId] = (inventory[obj.itemShopId] ?? 0) + 1
            playerPatch = { inventory }
          }
        }
      }
      return {
        session: { hallEvent: { ...he, objectResults: nextObjectResults } },
        player: playerPatch,
      }
    })
    if (objNow && !alreadyResolved) {
      const actorName = displayName(viewerId)
      let text: string | null = null
      if (choice === 'leave') {
        text = `${actorName}이(가) '${objNow.label}'을(를) 그냥 두기로 했다.`
      } else if (objNow.kind === 'hazard') {
        text = `${actorName}이(가) '${objNow.label}'을(를) 열어 보았다....... ${objNow.hazardText}`
      } else if (objNow.kind === 'item') {
        text = `${actorName}이(가) '${objNow.label}'을(를) 열어 보고 ${objNow.itemCoins ? `코인 ${objNow.itemCoins}개를` : '아이템을'} 손에 넣었다.`
      } else if (objNow.kind === 'puzzle') {
        text = `${actorName}이(가) '${objNow.label}'을(를) 열어 보니 문제가 나타났다.`
      }
      if (text) {
        void sendClassroomMessageSync({
          id: `he-${Date.now()}-obj-${objectId}`,
          authorId: 'admin',
          text,
          time: '지금',
        })
      }
    }
  }

  function submitHallPuzzleAnswer(objectId: string, text: string) {
    if (!viewerId || !text.trim()) return
    const heNow = session.hallEvent
    const eventNow = heNow.eventId ? hallEventById(heNow.eventId) : null
    const objNow = eventNow?.objects.find((o) => o.id === objectId)
    const puzzleNow = objNow?.puzzleId ? hallPuzzleById(objNow.puzzleId) : null
    void runAbilityTransaction(viewerId, (sess) => {
      const he = sess.hallEvent
      if (!he.eventId) return {}
      const event = hallEventById(he.eventId)
      if (!event) return {}
      const obj = event.objects.find((o) => o.id === objectId)
      if (!obj || obj.kind !== 'puzzle' || !obj.puzzleId) return {}
      const existing = he.objectResults[objectId]
      if (!existing || existing.status !== 'opened') return {}
      if (existing.puzzleSolved || existing.puzzleAttempts >= 3) return {}
      const puzzle = hallPuzzleById(obj.puzzleId)
      if (!puzzle) return {}
      const correct = normalize(text) === normalize(puzzle.answer)
      const nextResult: HallObjectResult = {
        ...existing,
        puzzleAttempts: existing.puzzleAttempts + 1,
        puzzleSolved: correct,
      }
      return {
        session: { hallEvent: { ...he, objectResults: { ...he.objectResults, [objectId]: nextResult } } },
      }
    })
    if (objNow && puzzleNow && normalize(text) === normalize(puzzleNow.answer)) {
      void sendClassroomMessageSync({
        id: `he-${Date.now()}-puzzle-${objectId}`,
        authorId: 'admin',
        text: `${displayName(viewerId)}이(가) '${objNow.label}'의 문제를 풀었다....... 정답: ${puzzleNow.answer}`,
        time: '지금',
      })
    }
  }

  function joinHallMinigame(objectId: string, choiceId: string) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess) => {
      const he = sess.hallEvent
      if (!he.eventId) return {}
      const event = hallEventById(he.eventId)
      if (!event) return {}
      const obj = event.objects.find((o) => o.id === objectId)
      if (!obj || obj.kind !== 'minigame') return {}
      if (obj.minigameKind === 'numberbaseball' || obj.minigameKind === 'davinci') return {}
      const options = MINIGAME_OPTIONS[obj.minigameKind ?? 'oddeven']
      if (!options.some((o) => o.id === choiceId)) return {}
      const existing = he.objectResults[objectId]
      const alreadyIn =
        existing && (existing.minigamePending.includes(viewerId) || existing.minigameParticipants[viewerId] !== undefined)
      if (alreadyIn) return {}
      // 미니게임은 선착순 한 명만 도전할 수 있다 — 이미 누군가 대기 중이거나 결과가 나와 있으면 더 이상 받지 않는다.
      const soloLocked =
        existing && (existing.minigamePending.length > 0 || Object.keys(existing.minigameParticipants).length > 0)
      if (soloLocked) return {}
      const nextResult: HallObjectResult = {
        status: 'opened',
        actorId: existing?.actorId ?? null,
        puzzleSolved: false,
        puzzleAttempts: 0,
        minigamePending: [...(existing?.minigamePending ?? []), viewerId],
        minigameChoices: { ...(existing?.minigameChoices ?? {}), [viewerId]: choiceId },
        minigameParticipants: existing?.minigameParticipants ?? {},
        minigameLog: existing?.minigameLog ?? [],
      }
      return {
        session: { hallEvent: { ...he, objectResults: { ...he.objectResults, [objectId]: nextResult } } },
      }
    })
  }

  function resolveHallMinigame(objectId: string) {
    if (!isAdminFlag) return
    const he = session.hallEvent
    const event = hallEventById(he.eventId ?? '')
    if (!event) return
    const obj = event.objects.find((o) => o.id === objectId)
    if (!obj || obj.kind !== 'minigame') return
    const options = MINIGAME_OPTIONS[obj.minigameKind ?? 'oddeven']
    void runHallMinigameTransaction(objectId, (sess, participants) => {
      const heInner = sess.hallEvent
      const existing = heInner.objectResults[objectId]
      if (!existing || existing.minigamePending.length === 0) return {}
      const pendingIds = existing.minigamePending
      let actualOutcome: { id: string; label: string }
      let gameLog: string
      if (obj.minigameKind === 'robo77') {
        const roll = rollRobo77()
        actualOutcome = options.find((o) => o.id === roll.outcomeId)!
        gameLog = `${obj.label} 앞에서 로보 77 승부를 걸었다....... 뽑힌 숫자는 ${roll.draws.join(', ')}, 합계 ${roll.sum}. 결과는 '${actualOutcome.label}'.`
      } else {
        actualOutcome = options[Math.floor(Math.random() * options.length)]
        gameLog = buildMinigameLog(obj.minigameKind, obj.label, actualOutcome.label)
      }
      const nextParticipants = { ...existing.minigameParticipants }
      const playerPatches: Record<string, Partial<PlayerDoc>> = {}
      pendingIds.forEach((id) => {
        const p = participants[id]
        if (!p) return
        const won = existing.minigameChoices[id] === actualOutcome.id
        nextParticipants[id] = won
        if (won) {
          playerPatches[id] = { coins: p.coins + (obj.minigameWinCoins ?? 2) }
        } else {
          const patch: Partial<PlayerDoc> = {}
          if (obj.hpDamage) patch.hp = Math.max(0, p.hp - obj.hpDamage)
          if (obj.staminaDamage) patch.stamina = Math.max(0, p.stamina - obj.staminaDamage)
          playerPatches[id] = patch
        }
      })
      const nextResult: HallObjectResult = {
        ...existing,
        minigamePending: [],
        minigameParticipants: nextParticipants,
        minigameLog: [...existing.minigameLog, gameLog],
      }
      const resultSummary = pendingIds
        .map((id) => `${displayName(id)}(${nextParticipants[id] ? '승' : '패'})`)
        .join(', ')
      return {
        session: { hallEvent: { ...heInner, objectResults: { ...heInner.objectResults, [objectId]: nextResult } } },
        playerPatches,
        classroomMessage: {
          id: `he-${Date.now()}-minigame-${objectId}`,
          authorId: 'admin',
          text: `${gameLog} — ${resultSummary}`,
          time: '지금',
        },
      }
    })
  }

  // 숫자 야구/다빈치코드: 선착순 한 명만 도전할 수 있고, 그 사람이 여러 턴에 걸쳐 직접
  // 그것과 겨룬다(단발성 결과 통보가 아니라 실제 진행형 게임).
  function startHallGame(objectId: string) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess) => {
      const he = sess.hallEvent
      if (!he.eventId) return {}
      const event = hallEventById(he.eventId)
      if (!event) return {}
      const obj = event.objects.find((o) => o.id === objectId)
      if (!obj || obj.kind !== 'minigame') return {}
      if (obj.minigameKind !== 'numberbaseball' && obj.minigameKind !== 'davinci') return {}
      const existing = he.objectResults[objectId]
      if (existing?.game) return {}
      const game: HallGameState =
        obj.minigameKind === 'numberbaseball'
          ? { kind: 'numberbaseball', actorId: viewerId, outcome: 'pending', secret: generateBaseballSecret(), guesses: [], attemptsLeft: 5 }
          : {
              kind: 'davinci',
              actorId: viewerId,
              outcome: 'pending',
              tiles: generateDavinciTiles(),
              revealed: [false, false, false, false],
              attemptsLeft: 5,
              attempts: [],
            }
      const nextResult: HallObjectResult = {
        status: 'opened',
        actorId: viewerId,
        puzzleSolved: false,
        puzzleAttempts: 0,
        minigamePending: [],
        minigameChoices: {},
        minigameParticipants: {},
        minigameLog: existing?.minigameLog ?? [],
        game,
      }
      return {
        session: { hallEvent: { ...he, objectResults: { ...he.objectResults, [objectId]: nextResult } } },
      }
    })
  }

  function submitBaseballGuess(objectId: string, guess: string) {
    if (!viewerId) return
    if (!/^\d{3}$/.test(guess) || new Set(guess).size !== 3) return
    const heNow = session.hallEvent
    const gameNow = heNow.objectResults[objectId]?.game
    if (!gameNow || gameNow.kind !== 'numberbaseball' || gameNow.actorId !== viewerId || gameNow.outcome !== 'pending') return
    const eventNow = heNow.eventId ? hallEventById(heNow.eventId) : null
    const objNow = eventNow?.objects.find((o) => o.id === objectId)
    const { strikes } = scoreBaseball(gameNow.secret, guess)
    const win = strikes === 3
    const attemptsLeftAfter = gameNow.attemptsLeft - 1
    const outcome: 'pending' | 'win' | 'lose' = win ? 'win' : attemptsLeftAfter <= 0 ? 'lose' : 'pending'
    void runAbilityTransaction(viewerId, (sess, player) => {
      const he = sess.hallEvent
      const existing = he.objectResults[objectId]
      const game = existing?.game
      if (!game || game.kind !== 'numberbaseball' || game.actorId !== viewerId || game.outcome !== 'pending') return {}
      const scored = scoreBaseball(game.secret, guess)
      const nextWin = scored.strikes === 3
      const nextAttemptsLeft = game.attemptsLeft - 1
      const nextOutcome: 'pending' | 'win' | 'lose' = nextWin ? 'win' : nextAttemptsLeft <= 0 ? 'lose' : 'pending'
      const nextGame: BaseballGameState = {
        ...game,
        guesses: [...game.guesses, { guess, strikes: scored.strikes, balls: scored.balls }],
        attemptsLeft: nextAttemptsLeft,
        outcome: nextOutcome,
      }
      const nextResult: HallObjectResult = { ...existing, game: nextGame }
      let playerPatch: Partial<PlayerDoc> | undefined
      if (nextOutcome === 'win' && objNow) {
        playerPatch = { coins: player.coins + (objNow.minigameWinCoins ?? 3) }
      } else if (nextOutcome === 'lose' && objNow) {
        playerPatch = {}
        if (objNow.hpDamage) playerPatch.hp = Math.max(0, player.hp - objNow.hpDamage)
        if (objNow.staminaDamage) playerPatch.stamina = Math.max(0, player.stamina - objNow.staminaDamage)
      }
      return {
        session: { hallEvent: { ...he, objectResults: { ...he.objectResults, [objectId]: nextResult } } },
        player: playerPatch,
      }
    })
    if (outcome !== 'pending' && objNow) {
      const text =
        outcome === 'win'
          ? `${displayName(viewerId)}이(가) '${objNow.label}' 숫자 야구에서 승리했다....... 정답은 ${gameNow.secret}. 코인 ${objNow.minigameWinCoins ?? 3}개를 얻었다.`
          : `${displayName(viewerId)}이(가) '${objNow.label}' 숫자 야구에서 패배했다....... 정답은 ${gameNow.secret}이었다.`
      void sendClassroomMessageSync({ id: `he-${Date.now()}-baseball-${objectId}`, authorId: 'admin', text, time: '지금' })
    }
  }

  function submitDavinciGuess(objectId: string, position: number, guessValue: number) {
    if (!viewerId) return
    const heNow = session.hallEvent
    const gameNow = heNow.objectResults[objectId]?.game
    if (!gameNow || gameNow.kind !== 'davinci' || gameNow.actorId !== viewerId || gameNow.outcome !== 'pending') return
    if (gameNow.revealed[position]) return
    const eventNow = heNow.eventId ? hallEventById(heNow.eventId) : null
    const objNow = eventNow?.objects.find((o) => o.id === objectId)
    const correct = gameNow.tiles[position] === guessValue
    const nextRevealed = gameNow.revealed.map((r, i) => (i === position && correct ? true : r))
    const win = correct && nextRevealed.every(Boolean)
    const attemptsLeftAfter = gameNow.attemptsLeft - 1
    const outcome: 'pending' | 'win' | 'lose' = win ? 'win' : attemptsLeftAfter <= 0 ? 'lose' : 'pending'
    void runAbilityTransaction(viewerId, (sess, player) => {
      const he = sess.hallEvent
      const existing = he.objectResults[objectId]
      const game = existing?.game
      if (!game || game.kind !== 'davinci' || game.actorId !== viewerId || game.outcome !== 'pending') return {}
      if (game.revealed[position]) return {}
      const isCorrect = game.tiles[position] === guessValue
      const revealed = game.revealed.map((r, i) => (i === position && isCorrect ? true : r))
      const nextWin = isCorrect && revealed.every(Boolean)
      const nextAttemptsLeft = game.attemptsLeft - 1
      const nextOutcome: 'pending' | 'win' | 'lose' = nextWin ? 'win' : nextAttemptsLeft <= 0 ? 'lose' : 'pending'
      const attemptResult: 'hit' | 'high' | 'low' = isCorrect ? 'hit' : guessValue < game.tiles[position] ? 'low' : 'high'
      const nextGame: DavinciGameState = {
        ...game,
        revealed,
        attemptsLeft: nextAttemptsLeft,
        outcome: nextOutcome,
        attempts: [...game.attempts, { position, guess: guessValue, result: attemptResult }],
      }
      const nextResult: HallObjectResult = { ...existing, game: nextGame }
      let playerPatch: Partial<PlayerDoc> | undefined
      if (nextOutcome === 'win' && objNow) {
        playerPatch = { coins: player.coins + (objNow.minigameWinCoins ?? 3) }
      } else if (nextOutcome === 'lose' && objNow) {
        playerPatch = {}
        if (objNow.hpDamage) playerPatch.hp = Math.max(0, player.hp - objNow.hpDamage)
        if (objNow.staminaDamage) playerPatch.stamina = Math.max(0, player.stamina - objNow.staminaDamage)
      }
      return {
        session: { hallEvent: { ...he, objectResults: { ...he.objectResults, [objectId]: nextResult } } },
        player: playerPatch,
      }
    })
    if (outcome !== 'pending' && objNow) {
      const text =
        outcome === 'win'
          ? `${displayName(viewerId)}이(가) '${objNow.label}' 다빈치코드에서 승리했다....... 숫자 배열은 ${gameNow.tiles.join(', ')}. 코인 ${objNow.minigameWinCoins ?? 3}개를 얻었다.`
          : `${displayName(viewerId)}이(가) '${objNow.label}' 다빈치코드에서 패배했다....... 숫자 배열은 ${gameNow.tiles.join(', ')}이었다.`
      void sendClassroomMessageSync({ id: `he-${Date.now()}-davinci-${objectId}`, authorId: 'admin', text, time: '지금' })
    }
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

  function editComment(postId: string, commentId: string, text: string) {
    if (!text.trim()) return
    const myId = isAdminFlag ? 'admin' : viewerId
    if (!myId) return
    void editCommentSync(postId, commentId, myId, text.trim())
  }

  function deleteComment(postId: string, commentId: string) {
    const myId = isAdminFlag ? 'admin' : viewerId
    if (!myId) return
    void deleteCommentSync(postId, commentId, myId)
  }

  function createFeedPost(title: string, body: string, commentsEnabled: boolean) {
    if (!title.trim() || !body.trim()) return
    void createFeedPostSync({
      authorLabel: '[??]',
      tag: '공지',
      title: title.trim(),
      body: body.trim(),
      time: '방금',
      commentsEnabled,
    })
  }

  function editFeedPost(postId: string, title: string, body: string) {
    if (!isAdminFlag || !title.trim() || !body.trim()) return
    void editFeedPostSync(postId, title.trim(), body.trim())
  }

  function deleteFeedPost(postId: string) {
    if (!isAdminFlag) return
    void deleteFeedPostSync(postId)
  }

  // 브로드캐스트(공지/괴이 출현/이벤트)는 팝업·상단바로만 전달되고, 메인 피드에는 절대 자동으로
  // 올라가지 않는다. 피드에는 GM이 메인 화면의 + 버튼으로 직접 작성한 글만 올라간다.
  function sendBroadcast(
    kind: BroadcastKind,
    title: string,
    body: string,
    variant?: string,
    footer?: string,
  ) {
    if (!title.trim() || !body.trim()) return
    const id = `bc-${Date.now()}`
    const bc: Broadcast = {
      id,
      kind,
      title: title.trim(),
      body: body.trim(),
      ...(variant ? { variant } : {}),
      ...(footer ? { footer } : {}),
    }
    void sendBroadcastSync(bc)
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

  function setMissionsOpen(open: boolean) {
    if (!isAdminFlag) return
    void patchSession({ missionsOpen: open })
  }

  function setDraftPreview(team: string[]) {
    void updateMissionSync((m) => missionReducer(m, { type: 'SET_DRAFT_PREVIEW', team }))
  }
  function confirmProposal(team: string[]) {
    const leaderName = displayName(session.mission.turnOrder[session.mission.leaderIdx])
    void updateMissionSync((m) => missionReducer(m, { type: 'CONFIRM_PROPOSAL', team, leaderName }))
  }
  function castVote(approve: boolean) {
    if (!viewerId) return
    void updateMissionSync((m) => missionReducer(m, { type: 'CAST_VOTE', viewerId, approve }))
  }
  function closeVote() {
    if (!isAdminFlag) return
    void updateMissionSync((m) => missionReducer(m, { type: 'CLOSE_VOTE' }))
  }
  function submitCard(card: 'success' | 'fail') {
    if (!viewerId) return
    void updateMissionSync((m) => missionReducer(m, { type: 'SUBMIT_CARD', viewerId, card }))
  }
  function closeExecute() {
    if (!isAdminFlag) return
    void updateMissionSync((m) => missionReducer(m, { type: 'CLOSE_EXECUTE' }))
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

  function setClassroomOpen(open: boolean) {
    if (!isAdminFlag) return
    void patchSession({ classroomOpen: open })
  }

  function setAbilitiesOpen(open: boolean) {
    if (!isAdminFlag) return
    void patchSession({ abilitiesOpen: open })
  }

  function assignRoleManually(characterId: string, nickname: string) {
    if (!isAdminFlag || !nickname.trim()) return
    void assignRoleManuallySync(characterId, nickname)
  }

  function grantCoins(characterId: string, amount: number) {
    if (!isAdminFlag || !Number.isFinite(amount) || amount === 0) return
    void grantCoinsSync(characterId, Math.round(amount))
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
    sendBroadcast('notice', '엔딩', ENDING_SCRIPTS[key], key, ENDING_LABELS[key])
  }

  function abilityMax(role: string): number {
    return ABILITY_MAX_USES[role as keyof typeof ABILITY_MAX_USES] ?? 1
  }

  function useRecordBook(targetAId: string, targetBId: string) {
    if (!viewerId || targetAId === targetBId || targetAId === viewerId || targetBId === viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!sess.abilitiesOpen) return {}
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('기록자')) return {}
      const today = new Date().toISOString().slice(0, 10)
      if (player.lastRecordBookDate === today) return {}
      const a = CHARACTERS.find((c) => c.id === targetAId)
      const b = CHARACTERS.find((c) => c.id === targetBId)
      if (!a || !b) return {}
      const lieOnA = Math.random() < 0.5
      const teamLabel = (team: 'ward' | 'sin') => (team === 'ward' ? '학생' : '괴이')
      const trueA = resolveTeamCheckPure(sess.disguiseArmedUntilMs, a.id).team
      const trueB = resolveTeamCheckPure(sess.disguiseArmedUntilMs, b.id).team
      const shownA = lieOnA ? (trueA === 'ward' ? 'sin' : 'ward') : trueA
      const shownB = !lieOnA ? (trueB === 'ward' ? 'sin' : 'ward') : trueB
      const text = `《출석부》 ${displayName(a.id)} = ${teamLabel(shownA)}, ${displayName(b.id)} = ${teamLabel(shownB)} — 둘 중 하나는 거짓이다.`
      return {
        session: {
          abilityLog: [...(sess.abilityLog ?? []), makeAbilityLogEntry(viewerId, '출석부', text, [targetAId, targetBId])],
        },
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          lastRecordBookDate: today,
          personalClues: [...player.personalClues, text],
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(text)],
        },
      }
    })
  }

  function investigate(targetId: string) {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!sess.abilitiesOpen) return {}
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('감찰자')) return {}
      const check = resolveTeamCheckPure(sess.disguiseArmedUntilMs, targetId)
      const resultText = `《학생부 조사》 ${displayName(targetId)} — 실패 카드를 ${check.team === 'sin' ? '낼 수 있다' : '낼 수 없다'}.`
      return {
        session: {
          abilityLog: [...(sess.abilityLog ?? []), makeAbilityLogEntry(viewerId, '학생부 조사', resultText, [targetId])],
        },
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
      if (!sess.abilitiesOpen) return {}
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('보호자')) return {}
      if (sess.mission.shielded) return {}
      const text = '《수호》를 발동했다 — 다음 조사 결과에서 실패 카드 1 장이 무효화된다.'
      return {
        session: {
          mission: { ...sess.mission, shielded: true },
          abilityLog: [...(sess.abilityLog ?? []), makeAbilityLogEntry(viewerId, '수호', text)],
        },
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
      if (!sess.abilitiesOpen) return {}
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('목격자')) return {}
      const count = sess.mission.failCounts[missionIndex]
      if (count === null || count === undefined) return {}
      const text = `《CCTV》 ${missionIndex + 1} 차 조사 — 실패 카드 ${count} 장.`
      return {
        session: { abilityLog: [...(sess.abilityLog ?? []), makeAbilityLogEntry(viewerId, 'CCTV', text)] },
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
      (sess, me, target) => {
        if (!sess.abilitiesOpen) return {}
        if (!me.abilityUnlocked || me.abilityUseCount >= abilityMax('괴이의 사도')) return {}
        const today = new Date().toISOString().slice(0, 10)
        if (me.lastDiscernDate === today) return {}
        if (!target) return {}
        const targetChar = CHARACTERS.find((c) => c.id === targetId)!
        const text = `《분별》 ${displayName(targetId)}의 능력 — ${targetChar.abilityName}(${ABILITY_SUMMARY[targetChar.role]}), 지금까지 ${target.abilityUseCount} 회 발동.`
        return {
          session: { abilityLog: [...(sess.abilityLog ?? []), makeAbilityLogEntry(viewerId, '분별', text, [targetId])] },
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
      if (!sess.abilitiesOpen) return {}
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('파괴자')) return {}
      if (!sess.mission.proposedTeam.includes(viewerId)) return {}
      if (sess.mission.missionResults[sess.mission.missionIndex] !== 'success') return {}
      const nextMission = missionReducer(sess.mission, { type: 'FORGE_RESULT' })
      const text = `《파괴》 ${sess.mission.missionIndex + 1} 차 조사의 결과를 몰래 조작했다.`
      return {
        session: {
          mission: nextMission,
          abilityLog: [...(sess.abilityLog ?? []), makeAbilityLogEntry(viewerId, '파괴', text)],
        },
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(text)],
        },
      }
    })
  }

  function revengerCheck(targetId: string) {
    if (!viewerId || targetId === viewerId) return
    void runCombatTransaction(
      viewerId,
      () => targetId,
      (sess, me, target) => {
        if (!sess.abilitiesOpen) return {}
        if (!me.abilityUnlocked || me.abilityUseCount >= abilityMax('복수자')) return {}
        if (!target) return {}
        const targetChar = CHARACTERS.find((c) => c.id === targetId)!
        const check = resolveTeamCheckPure(sess.disguiseArmedUntilMs, targetId)
        const trueRoleLabel =
          check.team === targetChar.team
            ? targetChar.role === '일반학생'
              ? '(???)'
              : `${TEAM_LABEL[targetChar.team]} · ${targetChar.role}`
            : '(???)'
        const resultText = `《투시》 ${displayName(targetId)}의 진짜 정체 — ${trueRoleLabel}.`
        const notifyText = '누군가 당신의 정체를 확인했다....... 누가 그랬는지는 알 수 없다.'
        return {
          session: {
            abilityLog: [...(sess.abilityLog ?? []), makeAbilityLogEntry(viewerId, '투시', resultText, [targetId])],
          },
          me: {
            abilityUseCount: me.abilityUseCount + 1,
            personalClues: [...me.personalClues, resultText],
            gmDmMessages: [...me.gmDmMessages, makeGmDmMsg(resultText)],
          },
          target: {
            gmDmMessages: [...target.gmDmMessages, makeGmDmMsg(notifyText)],
          },
        }
      },
    )
  }

  function armDisguise() {
    if (!viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!sess.abilitiesOpen) return {}
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('잠입자')) return {}
      if (sess.disguiseArmedUntilMs && Date.now() < sess.disguiseArmedUntilMs) return {}
      const text = '《위장》을 걸었다 — 6시간 동안 정체 확인 결과가 무조건 학생으로 나온다.'
      return {
        session: {
          disguiseArmedUntilMs: Date.now() + DISGUISE_DURATION_MS,
          abilityLog: [...(sess.abilityLog ?? []), makeAbilityLogEntry(viewerId, '위장', text)],
        },
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          personalClues: [...player.personalClues, text],
          gmDmMessages: [...player.gmDmMessages, makeGmDmMsg(text)],
        },
      }
    })
  }

  function investigateLeak(targetId: string) {
    if (!viewerId || targetId === viewerId) return
    void runAbilityTransaction(viewerId, (sess, player) => {
      if (!sess.abilitiesOpen) return {}
      if (!player.abilityUnlocked || player.abilityUseCount >= abilityMax('망각자')) return {}
      if (sess.mission.missionResults[2] === null) return {}
      const targetName = displayName(targetId)
      const latest = [...(sess.abilityLog ?? [])]
        .filter((e) => e.characterId === targetId)
        .sort((a, b) => b.atMs - a.atMs)[0]
      let resultText: string
      let leakText: string
      if (!latest) {
        resultText = `${targetName}는 능력을 사용한 적이 없다.`
        leakText = `누군가가 유출했다. ${targetName}는 능력을 쓴 적이 없다는데.......`
      } else if (latest.targetCharacterIds.length === 0) {
        resultText = `${targetName}가 능력을 사용했지만, 특정 인물을 대상으로 하지는 않았다.`
        leakText = `누군가가 유출했다. ${targetName}가 능력을 썼다는데, 누구를 향한 건지는 알 수 없다는 것 같다.......`
      } else {
        const names = latest.targetCharacterIds.map((id) => displayName(id)).join(', ')
        resultText = `${targetName}가 ${names}에게 능력을 사용했다.`
        leakText = `누군가가 유출했다. ${targetName}가 ${names}에게 자신의 능력을 썼다는데.......`
      }
      const entry: LeakEntry = {
        id: `lk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        targetId,
        resultText,
        leakText,
        published: false,
        atMs: Date.now(),
      }
      return {
        player: {
          abilityUseCount: player.abilityUseCount + 1,
          leakLog: [...(player.leakLog ?? []), entry],
        },
      }
    })
  }

  function publishLeak(leakId: string) {
    if (!viewerId) return
    void publishLeakSync(viewerId, leakId).then((leakText) => {
      if (leakText) sendBroadcast('notice', '익명의 유출', leakText)
    })
  }

  function attackCreature(roomId: RoomId) {
    if (!viewerId) return
    const myId = viewerId
    void runRoomCombatTransaction(roomId, (sess, occupants) => {
      const roomEvent = sess.roomEvents[roomId]
      const combat = roomEvent?.combat
      if (!combat || combat.defeated) return {}
      const room = ROOMS.find((r) => r.id === roomId)
      const occupantIds = sess.roomOccupancy[roomId] ?? []
      if (!room || occupantIds.length < room.capacity) return {}
      const isEligible = (id: string) => (occupants[id]?.hp ?? 0) > 0
      if (effectiveTurnPlayerId(occupantIds, combat.turnPlayerId, isEligible) !== myId) return {}
      const me = occupants[myId]
      if (!me || me.hp <= 0 || me.stamina < ATTACK_STAMINA_COST) return {}
      const creature = creatureById(combat.creatureId)
      if (!creature) return {}

      const myAtk = BASE_ATK + me.weaponAtkBonus
      const roll = rollDice()
      const damage = roll.hit ? myAtk : 0
      const newCreatureHp = Math.max(0, combat.creatureHp - damage)
      const defeated = newCreatureHp <= 0

      const log: CombatLogEntry[] = [...combat.log]
      log.push(
        makeCombatLog(
          roll.hit
            ? `${displayName(myId)}이(가) ${creature.name}을(를) 공격했다....... ${describeDiceRoll(roll)} — 명중! 공격력 ${myAtk}만큼 피해를 입혔다.`
            : `${displayName(myId)}이(가) ${creature.name}을(를) 공격했다....... ${describeDiceRoll(roll)} — 빗나갔다.`,
        ),
      )

      const playerPatches: Record<string, Partial<PlayerDoc>> = {
        [myId]: { stamina: me.stamina - ATTACK_STAMINA_COST },
      }

      if (defeated) {
        log.push(makeCombatLog(`${creature.name}이(가) 쓰러졌다....... 짙게 배어 있던 기운이 서서히 옅어진다.`))
        log.push(makeCombatLog(`겨우 쓰러뜨렸다....... ${ROOM_DEFEAT_EVICT_MIN} 분 내로 이 방에서 나가자!`))
        for (const pid of occupantIds) {
          const occ = occupants[pid]
          if (!occ) continue
          playerPatches[pid] = {
            ...playerPatches[pid],
            coins: occ.coins + creature.coinReward,
          }
        }
        playerPatches[myId] = { ...playerPatches[myId], abilityUnlocked: true }
      } else {
        const defenderId =
          combat.defenderId && combat.defenderId !== myId && isEligible(combat.defenderId) ? combat.defenderId : null
        const retaliateAgainstSelf = !defenderId
        const defenderStats = retaliateAgainstSelf ? me : occupants[defenderId!]
        const defenderDef = defenderStats?.armorDefBonus ?? 0
        const rollC = rollDice()
        const dmgC = rollC.hit ? Math.max(1, creature.atk - Math.floor(defenderDef / 2)) : 0
        const defenderName = displayName(retaliateAgainstSelf ? myId : defenderId!)
        log.push(
          makeCombatLog(
            rollC.hit
              ? `${creature.name}이(가) ${defenderName}을(를) 향해 반격했다....... ${describeDiceRoll(rollC)} — 명중! 공격력 ${creature.atk}(방어 적용 후 ${dmgC})만큼 피해를 입었다.`
              : `${creature.name}이(가) ${defenderName}을(를) 향해 반격했다....... ${describeDiceRoll(rollC)} — 빗나갔다.`,
          ),
        )
        if (rollC.hit && defenderStats) {
          const dId = retaliateAgainstSelf ? myId : defenderId!
          playerPatches[dId] = {
            ...playerPatches[dId],
            hp: Math.max(0, defenderStats.hp - dmgC),
          }
        }
      }

      const nextEligible = (id: string) => {
        const patchedHp = playerPatches[id]?.hp
        return (patchedHp ?? occupants[id]?.hp ?? 0) > 0
      }
      const nextTurnId = advanceTurnPlayerId(occupantIds, myId, nextEligible)
      const nextDefenderId = combat.defenderId === nextTurnId ? null : combat.defenderId

      const nextRoomEvents = {
        ...sess.roomEvents,
        [roomId]: {
          ...roomEvent,
          combat: {
            ...combat,
            creatureHp: newCreatureHp,
            log,
            defeated,
            defeatedAtMs: defeated ? Date.now() : combat.defeatedAtMs,
            turnPlayerId: nextTurnId,
            defenderId: nextDefenderId,
          },
        },
      }

      return {
        session: { roomEvents: nextRoomEvents },
        playerPatches,
      }
    })
  }

  function defendInCombat(roomId: RoomId) {
    if (!viewerId) return
    const myId = viewerId
    void runRoomCombatTransaction(roomId, (sess, occupants) => {
      const roomEvent = sess.roomEvents[roomId]
      const combat = roomEvent?.combat
      if (!combat || combat.defeated) return {}
      const room = ROOMS.find((r) => r.id === roomId)
      const occupantIds = sess.roomOccupancy[roomId] ?? []
      if (!room || occupantIds.length < room.capacity) return {}
      const isEligible = (id: string) => (occupants[id]?.hp ?? 0) > 0
      if (effectiveTurnPlayerId(occupantIds, combat.turnPlayerId, isEligible) !== myId) return {}
      const me = occupants[myId]
      if (!me || me.hp <= 0) return {}

      const log: CombatLogEntry[] = [
        ...combat.log,
        makeCombatLog(
          `${displayName(myId)}이(가) 앞으로 나서 방어 태세를 취했다....... 다음 자기 차례까지 팀원들이 받을 반격을 대신 맞는다.`,
        ),
      ]
      const nextTurnId = advanceTurnPlayerId(occupantIds, myId, isEligible)
      const nextRoomEvents = {
        ...sess.roomEvents,
        [roomId]: {
          ...roomEvent,
          combat: { ...combat, log, turnPlayerId: nextTurnId, defenderId: myId },
        },
      }
      return { session: { roomEvents: nextRoomEvents } }
    })
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
        const equip = equipPatch(itemId, item)
        if (equip) return { me: { coins: me.coins - item.price, ...equip } }
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
        const equip = equipPatch(itemId, item)
        if (equip) {
          return {
            me: { coins: me.coins - item.price },
            target: equip,
          }
        }
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
    const team = resolvedTeam(session.mission, viewerId)
    return team === 'veil' ? null : team
  })()

  const leakUnlocked = session.mission.missionResults[2] !== null

  const leakRevealPending =
    !!viewerId &&
    !!myPlayer &&
    !myPlayer.leakRevealShown &&
    forgottenIdentity !== null

  function dismissLeakReveal() {
    if (!viewerId || !forgottenIdentity) return
    const text = leakerRevealText(forgottenIdentity === 'ward' ? '학생' : '괴이')
    void patchPlayer(viewerId, {
      leakRevealShown: true,
      personalClues: [...(myPlayer?.personalClues ?? []), text],
    })
  }

  const myId = viewerId ?? 'admin'
  const feed: FeedPost[] = feedDocs.map((d) => feedPostToFeedPost(d.id, d, myId))
  const broadcast = session.broadcast && session.broadcast.id !== dismissedBroadcastId ? session.broadcast : null

  // 방송실 게시판에 새 공지가 올라오면 상단바 + 백그라운드 알림을 띄운다 (작성자 본인은 제외).
  const feedPostInitRef = useRef(false)
  const lastFeedTopIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!feedLoaded) return
    const top = feed[0] ?? null
    if (!feedPostInitRef.current) {
      feedPostInitRef.current = true
      lastFeedTopIdRef.current = top?.id ?? null
      return
    }
    if (top && top.id !== lastFeedTopIdRef.current && !isAdminFlag) {
      setTopAlert({ id: top.id, text: `[공지] ${top.title}` })
      notifyBackground('새 공지', top.title, 'main')
    }
    lastFeedTopIdRef.current = top?.id ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.map((p) => p.id).join(','), isAdminFlag, feedLoaded])

  // 공지 댓글에 새 댓글이 달리면 (나를 태그했으면 더 눈에 띄게) 상단바 + 백그라운드 알림을 띄운다.
  const feedCommentInitRef = useRef(false)
  const lastFeedCommentCountsRef = useRef<Record<string, number>>({})
  useEffect(() => {
    if (!feedLoaded) return
    if (!feedCommentInitRef.current) {
      feedCommentInitRef.current = true
      for (const post of feed) lastFeedCommentCountsRef.current[post.id] = post.comments.length
      return
    }
    for (const post of feed) {
      const prevCount = lastFeedCommentCountsRef.current[post.id] ?? 0
      if (post.comments.length > prevCount) {
        const last = post.comments[post.comments.length - 1]
        const myCommentId = isAdminFlag ? 'admin' : viewerId
        if (last.authorId !== myCommentId) {
          const senderName = displayName(last.authorId)
          const myName = isAdminFlag ? displayName('admin') : viewerId ? displayName(viewerId) : null
          const tagged = !!myName && last.text.includes(`@${myName}`)
          setTopAlert({ id: last.id, text: `${tagged ? '[태그] ' : ''}${senderName}: ${last.text}` })
          notifyBackground(
            tagged ? `${senderName}이(가) 나를 태그했다` : `${post.title} · ${senderName}`,
            last.text,
            'main',
          )
        }
      }
      lastFeedCommentCountsRef.current[post.id] = post.comments.length
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, viewerId, isAdminFlag, feedLoaded])

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
      kickFromRoom,
      roomMessages: session.roomMessages,
      sendRoomMessage,
      hasUnreadRoom,
      hasUnreadAnyRoom,
      markRoomRead,
      roomEvents: session.roomEvents,
      cardGames: session.cardGames,
      joinCardRoom,
      startCardGame,
      leaveCardRoom,
      kickFromCardRoom,
      playCard,
      endCardTurn,
      resetCardGame,
      closeRoomInvestigation,
      setRoomOpen,
      startHallwayInvestigation,
      advanceHallwayInvestigationLog,
      finishHallwayInvestigation,
      classroomMessages: session.classroomMessages,
      sendClassroomMessage,
      classroom: session.classroom,
      dispatchClassroomEvent,
      dispatchPuzzle,
      submitPuzzleAnswer,
      closeInvestigation,
      attemptDuel,
      hallEvent: session.hallEvent,
      dispatchHallEvent,
      addHallEventTime,
      advanceHallLog,
      voteHallLogChoice,
      closeHallLogVote,
      advanceHallObject,
      finishHallEvent,
      resolveHallObject,
      submitHallPuzzleAnswer,
      joinHallMinigame,
      resolveHallMinigame,
      startHallGame,
      submitBaseballGuess,
      submitDavinciGuess,
      feed,
      toggleHeart,
      addComment,
      editComment,
      deleteComment,
      toggleCommentsEnabled,
      createFeedPost,
      editFeedPost,
      deleteFeedPost,
      players,
      gmDmMessages: myPlayer?.gmDmMessages ?? [],
      sendGmDm,
      sendGmDmAsAdmin,
      collectedClues: session.collectedClues,
      abilityLog: session.abilityLog ?? [],
      missionMessages: session.missionMessages,
      sendMissionMessage,
      discussionOpen: session.discussionOpen,
      discussionOpenedAt: session.discussionOpenedAt,
      setDiscussionOpen,
      assignRoleManually,
      grantCoins,
      resetAllData,
      shopOpen: session.shopOpen,
      setShopOpen,
      classroomOpen: session.classroomOpen ?? true,
      setClassroomOpen,
      abilitiesOpen: session.abilitiesOpen ?? false,
      setAbilitiesOpen,
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
      notifPermission,
      requestBrowserNotifications,
      notifyPushEnabled,
      toggleBrowserNotifications,
      topAlert,
      dismissTopAlert,
      hasUnreadDm,
      markDmRead,
      markDmThreadRead,
      missionsOpen: session.missionsOpen,
      openMissions,
      setMissionsOpen,
      mission: session.mission,
      setDraftPreview,
      confirmProposal,
      castVote,
      closeVote,
      submitCard,
      closeExecute,
      continueMission,
      resetMission,
      abilityUnlocked,
      abilityUseCount,
      abilityMaxUses,
      personalClues,
      forgottenIdentity,
      leakRevealPending,
      dismissLeakReveal,
      useRecordBook,
      investigate,
      armShield,
      checkCctv,
      discern,
      usedDiscernToday,
      usedRecordBookToday,
      forgeResult,
      revengerCheck,
      armDisguise,
      disguiseArmed: !!session.disguiseArmedUntilMs && Date.now() < session.disguiseArmedUntilMs,
      disguiseArmedUntilMs: session.disguiseArmedUntilMs,
      leakLog: myPlayer?.leakLog ?? [],
      leakUnlocked,
      investigateLeak,
      publishLeak,
      hp,
      stamina,
      coins,
      atk,
      def,
      equippedWeaponId,
      equippedArmorId,
      incapacitated,
      attackCreature,
      defendInCombat,
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
      usedRecordBookToday,
      personalClues,
      forgottenIdentity,
      hp,
      stamina,
      coins,
      atk,
      def,
      equippedWeaponId,
      equippedArmorId,
      incapacitated,
      inventory,
      players,
      myPlayer,
      notifyRoomEvents,
      notifyGeneralBroadcasts,
      notifPermission,
      notifyPushEnabled,
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
