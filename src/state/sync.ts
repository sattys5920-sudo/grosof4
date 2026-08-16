import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from 'firebase/firestore'
import { db } from '../firebase'
import { CHARACTERS, DAY4_REVEAL_TEXT, ENDING_SCRIPTS, ROOMS } from '../data/characters'
import type {
  Broadcast,
  CardGameState,
  CardPile,
  CardRoomId,
  ChatMessage,
  ClassroomState,
  EndingKey,
  FeedComment,
  FeedPost,
  HallEventState,
  HalliCard,
  HalliGameState,
  HalliRoomId,
  RoomEventState,
  RoomId,
  SearchQuery,
} from '../data/types'
import {
  CARD_GAME_WIN_COINS,
  CARD_ROOM_CAPACITY,
  CARD_ROOM_IDS,
  CARD_ROOM_MIN_PLAYERS,
  CARD_TIMEOUT_STRIKES,
  CARD_TURN_TIME_LIMIT_MS,
  HAND_SIZE,
  MIN_PLAY_PER_TURN,
  hasAnyLegalCardMove,
  isLegalCardPlay,
  shuffledCardDeck,
} from '../data/cardGame'
import {
  HALLI_ROOM_CAPACITY,
  HALLI_ROOM_IDS,
  HALLI_ROOM_MIN_PLAYERS,
  buildHalliDeck,
  findMatchingColor,
  settleHalliTurn,
} from '../data/halliGame'
import { initialMissionState, type MissionState } from './missionEngine'
import { shopItemById } from '../data/shop'

const SESSION_ID = 'live'

export interface ClueItem {
  id: string
  title: string
  text: string
  source: string
  icon?: string | null
  emphasize?: boolean
}

export interface AbilityLogEntry {
  id: string
  characterId: string
  abilityName: string
  resultText: string
  targetCharacterIds: string[]
  atMs: number
}

export interface LeakEntry {
  id: string
  targetId: string
  resultText: string
  leakText: string
  published: boolean
  atMs: number
}

export interface SessionDoc {
  claimedSlots: string[]
  roomOccupancy: Record<RoomId, string[]>
  roomMessages: Record<RoomId, ChatMessage[]>
  roomEvents: Record<RoomId, RoomEventState>
  classroomMessages: ChatMessage[]
  classroom: ClassroomState
  broadcast: Broadcast | null
  missionsOpen: boolean
  mission: MissionState
  /** null이면 위장이 꺼진 상태. 값이 있으면 그 시각(ms)까지 위장이 유지된다. */
  disguiseArmedUntilMs: number | null
  collectedClues: ClueItem[]
  missionMessages: ChatMessage[]
  discussionOpen: boolean
  discussionOpenedAt: number | null
  shopOpen: boolean
  classroomOpen: boolean
  abilitiesOpen: boolean
  cardGames: Record<CardRoomId, CardGameState | null>
  halliGames: Record<HalliRoomId, HalliGameState | null>
  hallEvent: HallEventState
  storyDay: 0 | 1 | 2 | 3 | 4
  truthRevealed: boolean
  endingKey: EndingKey | null
  abilityLog: AbilityLogEntry[]
}

export interface PlayerDoc {
  nickname: string
  grade: string
  photo: string | null
  profileComplete: boolean
  abilityUnlocked: boolean
  abilityUseCount: number
  lastDiscernDate: string | null
  lastRecordBookDate: string | null
  personalClues: string[]
  gmDmMessages: ChatMessage[]
  hp: number
  stamina: number
  coins: number
  weaponAtkBonus: number
  armorDefBonus: number
  equippedWeaponId: string | null
  equippedArmorId: string | null
  inventory: Record<string, number>
  leakLog: LeakEntry[]
  leakRevealShown: boolean
  searcherUses: number
  searchQueries: SearchQuery[]
}

export interface FeedPostDoc {
  authorLabel: string
  tag: string
  title: string
  body: string
  imageDataUrl?: string
  time: string
  heartedBy: string[]
  commentsEnabled: boolean
  comments: FeedComment[]
  createdAtMs: number
}

const INITIAL_OCCUPANCY: Record<RoomId, string[]> = {
  library: [],
  infirmary: [],
  broadcast: [],
  rooftop: [],
  classroomA: [],
  classroomB: [],
  classroomC: [],
  classroomD: [],
}

const INITIAL_ROOM_MESSAGES: Record<RoomId, ChatMessage[]> = {
  library: [],
  infirmary: [],
  broadcast: [],
  rooftop: [],
  classroomA: [],
  classroomB: [],
  classroomC: [],
  classroomD: [],
}

function initialRoomEvents(): Record<RoomId, RoomEventState> {
  const result = {} as Record<RoomId, RoomEventState>
  for (const room of ROOMS) {
    result[room.id] = {
      event: null,
      cleared: false,
      clue: null,
      note: null,
      combat: null,
      open: false,
      investigation: { started: false, logIndex: 0, completed: false },
    }
  }
  // 카드 게임방(교실 A/B/C/D)은 조사·전투 트랙을 쓰지 않지만, Record<RoomId, ...> 타입을
  // 만족시키기 위해 비어 있는 상태를 채워 둔다.
  for (const id of [...CARD_ROOM_IDS, ...HALLI_ROOM_IDS]) {
    result[id] = {
      event: null,
      cleared: false,
      clue: null,
      note: null,
      combat: null,
      open: false,
      investigation: { started: false, logIndex: 0, completed: false },
    }
  }
  return result
}

function initialCardGames(): Record<CardRoomId, CardGameState | null> {
  const result = {} as Record<CardRoomId, CardGameState | null>
  for (const id of CARD_ROOM_IDS) result[id] = null
  return result
}

function initialHalliGames(): Record<HalliRoomId, HalliGameState | null> {
  const result = {} as Record<HalliRoomId, HalliGameState | null>
  for (const id of HALLI_ROOM_IDS) result[id] = null
  return result
}

export function defaultSessionState(): SessionDoc {
  return {
    claimedSlots: [],
    roomOccupancy: INITIAL_OCCUPANCY,
    roomMessages: INITIAL_ROOM_MESSAGES,
    roomEvents: initialRoomEvents(),
    classroomMessages: [],
    classroom: { status: 'locked', event: null, hint: null, note: null, attemptsUsed: 0 },
    broadcast: null,
    missionsOpen: false,
    mission: initialMissionState(),
    disguiseArmedUntilMs: null,
    shopOpen: false,
    classroomOpen: true,
    abilitiesOpen: false,
    cardGames: initialCardGames(),
    halliGames: initialHalliGames(),
    hallEvent: {
      eventId: null,
      logIndex: 0,
      objectIndex: 0,
      objectResults: {},
      startedAtMs: null,
      completedEventIds: [],
      logVotes: {},
      logResolutions: {},
      extraTimeMs: 0,
    },
    collectedClues: [],
    missionMessages: [],
    discussionOpen: false,
    discussionOpenedAt: null,
    storyDay: 0,
    truthRevealed: false,
    endingKey: null,
    abilityLog: [],
  }
}

function requireDb(): Firestore {
  if (!db) throw new Error('firebase가 설정되지 않았다')
  return db
}

function sessionRef() {
  return doc(requireDb(), 'sessions', SESSION_ID)
}

function playersCol() {
  return collection(requireDb(), 'sessions', SESSION_ID, 'players')
}

function playerRef(characterId: string) {
  return doc(playersCol(), characterId)
}

/**
 * 불가 전용 진단 도구. Firestore 문서 하나(1 MiB)에 세션 전체가 들어 있다 보니 채팅·로그가
 * 오래 쌓이면 한도에 가까워질 수 있는데, 그럴 경우 트랜잭션 쓰기가 계속 실패한다. 어떤
 * 필드가 얼마나 큰지 바로 확인할 수 있게 필드별 크기를 재서 돌려준다.
 */
export async function diagnoseSessionSizeSync(): Promise<{
  totalBytes: number
  fields: { key: string; bytes: number }[]
}> {
  const snap = await getDoc(sessionRef())
  const data = snap.data() ?? {}
  const fields = Object.entries(data)
    .map(([key, value]) => ({ key, bytes: new TextEncoder().encode(JSON.stringify(value ?? null)).length }))
    .sort((a, b) => b.bytes - a.bytes)
  const totalBytes = fields.reduce((sum, f) => sum + f.bytes, 0)
  return { totalBytes, fields }
}

function feedCol() {
  return collection(requireDb(), 'sessions', SESSION_ID, 'feedPosts')
}

interface AccountDoc {
  passwordHash: string
  characterId: string | null
  isAdmin?: boolean
  createdAtMs: number
}

function accountsCol() {
  return collection(requireDb(), 'sessions', SESSION_ID, 'accounts')
}

function accountRef(username: string) {
  return doc(accountsCol(), username)
}

async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function ensureSessionInitialized(): Promise<void> {
  const sref = sessionRef()
  try {
    await runTransaction(requireDb(), async (tx) => {
      const snap = await tx.get(sref)
      if (snap.exists()) return
      tx.set(sref, defaultSessionState())
    })
  } catch {
    // 다른 클라이언트가 그 사이 세션 문서를 이미 만들었다면 실패해도 목적은 달성된 것이므로 무시한다.
  }
}

// Firestore는 배열 안에 배열이 바로 중첩된 값을 허용하지 않는다.
// MissionState.teamHistory는 (string[] | null)[] 형태라 그대로 저장하면 거부당하므로,
// 저장할 때는 각 팀을 { team: string[] }로 감싸고 읽을 때 다시 풀어준다.
function serializeMission(mission: MissionState) {
  return {
    ...mission,
    teamHistory: mission.teamHistory.map((team) => (team ? { team } : null)),
  }
}

function deserializeMission(raw: MissionState): MissionState {
  const rawHistory = (raw.teamHistory ?? []) as unknown as ({ team: string[] } | string[] | null)[]
  return {
    ...raw,
    teamHistory: rawHistory.map((entry) => {
      if (!entry) return null
      return Array.isArray(entry) ? entry : entry.team
    }),
  }
}

export function subscribeSession(cb: (data: SessionDoc) => void) {
  return onSnapshot(sessionRef(), (snap) => {
    if (!snap.exists()) return
    const data = snap.data() as SessionDoc
    // 게임 도중 방(구관)이 새로 추가되는 등 스키마가 늘어나면, 그 전에 만들어진
    // 세션 문서에는 새 방의 키가 아예 없다. 그 상태로 roomEvents[room.id] 같은
    // 걸 그대로 읽으면 undefined라 화면이 통째로 깨진다. 그래서 기본값과
    // 병합해 없는 키만 채워 넣는다(있는 값은 그대로 유지).
    const defaults = defaultSessionState()
    const merged: SessionDoc = {
      ...defaults,
      ...data,
      roomOccupancy: { ...defaults.roomOccupancy, ...(data.roomOccupancy ?? {}) },
      roomMessages: { ...defaults.roomMessages, ...(data.roomMessages ?? {}) },
      roomEvents: { ...defaults.roomEvents, ...(data.roomEvents ?? {}) },
      cardGames: { ...defaults.cardGames, ...(data.cardGames ?? {}) },
      halliGames: { ...defaults.halliGames, ...(data.halliGames ?? {}) },
    }
    cb({ ...merged, mission: deserializeMission(merged.mission) })
  })
}

export function subscribeAllPlayers(cb: (players: Record<string, PlayerDoc>) => void) {
  return onSnapshot(playersCol(), (snap) => {
    const players: Record<string, PlayerDoc> = {}
    for (const d of snap.docs) players[d.id] = d.data() as PlayerDoc
    cb(players)
  })
}

export function subscribeFeed(cb: (posts: (FeedPostDoc & { id: string })[]) => void) {
  return onSnapshot(feedCol(), (snap) => {
    const posts = snap.docs.map((d) => ({ id: d.id, ...(d.data() as FeedPostDoc) }))
    posts.sort((a, b) => b.createdAtMs - a.createdAtMs)
    cb(posts)
  })
}

/** 아이디/비밀번호로 새 계정을 만들고, 남은 자리 중 하나를 무작위로 배정한다. */
export async function registerAccountSync(username: string, password: string): Promise<string> {
  const uname = username.trim().toLowerCase()
  if (!uname || !password) throw new Error('아이디와 비밀번호를 모두 입력해야 한다.')
  const passwordHash = await hashPassword(password)
  await ensureSessionInitialized()
  const aref = accountRef(uname)
  const sref = sessionRef()
  return runTransaction(requireDb(), async (tx) => {
    const aSnap = await tx.get(aref)
    if (aSnap.exists()) throw new Error('이미 사용 중인 아이디다.')
    const snap = await tx.get(sref)
    const data = snap.exists() ? (snap.data() as SessionDoc) : defaultSessionState()
    const claimed = data.claimedSlots ?? []
    const pool = CHARACTERS.filter((c) => !claimed.includes(c.id))
    if (pool.length === 0) throw new Error('더 이상 남은 자리가 없다.')
    const assigned = pool[Math.floor(Math.random() * pool.length)]
    if (!snap.exists()) {
      tx.set(sref, { ...defaultSessionState(), claimedSlots: [assigned.id] })
    } else {
      tx.update(sref, { claimedSlots: arrayUnion(assigned.id) })
    }
    const pref = playerRef(assigned.id)
    tx.set(pref, {
      nickname: assigned.name,
      grade: '1 학년',
      photo: null,
      profileComplete: false,
      abilityUnlocked: true,
      abilityUseCount: 0,
      lastDiscernDate: null,
      lastRecordBookDate: null,
      personalClues: [],
      gmDmMessages: [],
      hp: 100,
      stamina: 100,
      coins: 0,
      weaponAtkBonus: 0,
      armorDefBonus: 0,
      equippedWeaponId: null,
      equippedArmorId: null,
      inventory: {},
      leakLog: [],
      leakRevealShown: false,
      searcherUses: 0,
      searchQueries: [],
    })
    const account: AccountDoc = { passwordHash, characterId: assigned.id, createdAtMs: Date.now() }
    tx.set(aref, account)
    return assigned.id
  })
}

/** 아이디/비밀번호로 로그인해 배정되어 있던 캐릭터 id를 돌려준다. */
export async function loginAccountSync(username: string, password: string): Promise<string> {
  const uname = username.trim().toLowerCase()
  if (!uname || !password) throw new Error('아이디와 비밀번호를 모두 입력해야 한다.')
  const aSnap = await getDoc(accountRef(uname))
  if (!aSnap.exists()) throw new Error('존재하지 않는 아이디다.')
  const account = aSnap.data() as AccountDoc
  if (account.isAdmin || !account.characterId) throw new Error('불가 계정이다. 관리자 로그인을 이용해라.')
  const passwordHash = await hashPassword(password)
  if (passwordHash !== account.passwordHash) throw new Error('비밀번호가 일치하지 않는다.')
  return account.characterId
}

/** GM fallback: manually assign a specific unclaimed character slot to a nickname. */
export async function assignRoleManuallySync(characterId: string, nickname: string) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.exists() ? (snap.data() as SessionDoc) : defaultSessionState()
    const claimed = data.claimedSlots ?? []
    if (!snap.exists()) {
      tx.set(sref, { ...defaultSessionState(), claimedSlots: [characterId] })
    } else if (!claimed.includes(characterId)) {
      tx.update(sref, { claimedSlots: arrayUnion(characterId) })
    }
    const character = CHARACTERS.find((c) => c.id === characterId)!
    const pref = playerRef(characterId)
    tx.set(pref, {
      nickname: nickname.trim() || character.name,
      grade: '1 학년',
      photo: null,
      profileComplete: true,
      abilityUnlocked: true,
      abilityUseCount: 0,
      lastDiscernDate: null,
      lastRecordBookDate: null,
      personalClues: [],
      gmDmMessages: [],
      hp: 100,
      stamina: 100,
      coins: 0,
      weaponAtkBonus: 0,
      armorDefBonus: 0,
      equippedWeaponId: null,
      equippedArmorId: null,
      inventory: {},
      leakLog: [],
      leakRevealShown: false,
      searcherUses: 0,
      searchQueries: [],
    })
  })
}

export async function patchPlayer(characterId: string, patch: Partial<PlayerDoc>) {
  await updateDoc(playerRef(characterId), patch)
}

export async function grantCoinsSync(characterId: string, amount: number) {
  const pref = playerRef(characterId)
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(pref)
    if (!snap.exists()) return
    const data = snap.data() as PlayerDoc
    tx.update(pref, { coins: Math.max(0, data.coins + amount) })
  })
}

/** 코인 지급과 마찬가지로, 불가가 대가 없이 아이템을 지급한다. 무기/방어구는 즉시 장착되고, 그 외는 인벤토리에 쌓인다. */
export async function grantItemSync(characterId: string, itemId: string) {
  const item = shopItemById(itemId)
  if (!item) return
  const pref = playerRef(characterId)
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(pref)
    if (!snap.exists()) return
    const data = snap.data() as PlayerDoc
    if (item.kind === 'weapon') {
      tx.update(pref, { weaponAtkBonus: item.amount, equippedWeaponId: itemId })
      return
    }
    if (item.kind === 'armor') {
      tx.update(pref, { armorDefBonus: item.amount, equippedArmorId: itemId })
      return
    }
    if (item.kind === 'tool') {
      tx.update(pref, { searcherUses: (data.searcherUses ?? 0) + item.amount })
      return
    }
    const inventory = { ...(data.inventory ?? {}) }
    inventory[itemId] = (inventory[itemId] ?? 0) + 1
    tx.update(pref, { inventory })
  })
}

export async function sendGmDmMessageSync(characterId: string, msg: ChatMessage) {
  await updateDoc(playerRef(characterId), { gmDmMessages: arrayUnion(msg) })
}

export async function patchSession(patch: Partial<SessionDoc>) {
  await updateDoc(sessionRef(), patch)
}

export async function joinRoomSync(myId: string, roomId: RoomId) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    if (!data.roomEvents[roomId]?.open) return
    const occ = data.roomOccupancy
    const capacity = ROOMS.find((r) => r.id === roomId)!.capacity
    if ((occ[roomId] ?? []).length >= capacity) return
    // 구관은 어느 방이든(조사실이든 카드게임방이든) 한 사람이 한 번에 한 곳에만
    // 있을 수 있다 — 새 방에 들어가면 다른 모든 구관 방에서 자동으로 빠진다.
    const next: Record<RoomId, string[]> = { ...occ }
    for (const id of [...ROOMS.map((r) => r.id), ...CARD_ROOM_IDS, ...HALLI_ROOM_IDS]) {
      if (id !== roomId) next[id] = (next[id] ?? []).filter((pid) => pid !== myId)
    }
    next[roomId] = [...(next[roomId] ?? []).filter((id) => id !== myId), myId]
    tx.update(sref, { roomOccupancy: next })
  })
}

export async function leaveRoomSync(myId: string, roomId: RoomId) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    const occ = data.roomOccupancy
    const next = { ...occ, [roomId]: (occ[roomId] ?? []).filter((id) => id !== myId) }
    tx.update(sref, { roomOccupancy: next })
  })
}

export async function joinCardRoomSync(myId: string, roomId: CardRoomId) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    if (!data.cardGames) data.cardGames = initialCardGames()
    if (!data.roomEvents[roomId]?.open) return
    if (data.cardGames[roomId]?.status === 'playing') return
    const occ = data.roomOccupancy
    if ((occ[roomId] ?? []).includes(myId)) return
    if ((occ[roomId] ?? []).length >= CARD_ROOM_CAPACITY) return
    // 구관은 어느 방이든(조사실이든 카드게임방이든) 한 사람이 한 번에 한 곳에만
    // 있을 수 있다 — 새 방에 들어가면 다른 모든 구관 방에서 자동으로 빠진다.
    const next: Record<RoomId, string[]> = { ...occ }
    for (const id of [...ROOMS.map((r) => r.id), ...CARD_ROOM_IDS, ...HALLI_ROOM_IDS]) {
      if (id !== roomId) next[id] = (next[id] ?? []).filter((pid) => pid !== myId)
    }
    next[roomId] = [...(next[roomId] ?? []), myId]
    tx.update(sref, { roomOccupancy: next })
  })
}

export async function leaveCardRoomSync(myId: string, roomId: CardRoomId) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    if (!data.cardGames) data.cardGames = initialCardGames()
    if (data.cardGames[roomId]?.status === 'playing') return
    const occ = data.roomOccupancy
    tx.update(sref, { roomOccupancy: { ...occ, [roomId]: (occ[roomId] ?? []).filter((id) => id !== myId) } })
  })
}

// 강당/구관 곳곳에서 이미 실시간으로 몰려 쓰는 sessions/live 문서 하나를 공유하다 보니,
// 여러 명이 거의 동시에 배팅·초기화를 누르면 Firestore 트랜잭션끼리 충돌해 재시도가
// 필요할 수 있다. 기본 재시도 횟수(5 회)로는 10 인 동시 조작 상황에서 부족할 수 있어
// 할리갈리 관련 트랜잭션은 재시도 한도를 넉넉히 늘리고, 그래도 실패하면(네트워크 문제 등)
// 조용히 사라지지 않도록 콘솔에 남긴다.
const HALLI_TX_OPTIONS = { maxAttempts: 25 }

export async function joinHalliRoomSync(myId: string, roomId: HalliRoomId) {
  const sref = sessionRef()
  try {
    await runTransaction(
      requireDb(),
      async (tx) => {
        const snap = await tx.get(sref)
        const data = snap.data() as SessionDoc
        if (!data.halliGames) data.halliGames = initialHalliGames()
        if (!data.roomEvents[roomId]?.open) return
        // 배팅 단계(betting)든 진행 중(playing)이든 게임 객체가 있으면 입장/퇴장 모두 막는다.
        if (data.halliGames[roomId]) return
        const occ = data.roomOccupancy
        if ((occ[roomId] ?? []).includes(myId)) return
        if ((occ[roomId] ?? []).length >= HALLI_ROOM_CAPACITY) return
        const next: Record<RoomId, string[]> = { ...occ }
        for (const id of [...ROOMS.map((r) => r.id), ...CARD_ROOM_IDS, ...HALLI_ROOM_IDS]) {
          if (id !== roomId) next[id] = (next[id] ?? []).filter((pid) => pid !== myId)
        }
        next[roomId] = [...(next[roomId] ?? []), myId]
        tx.update(sref, { roomOccupancy: next })
      },
      HALLI_TX_OPTIONS,
    )
  } catch (err) {
    console.error('joinHalliRoomSync 실패', err)
  }
}

export async function leaveHalliRoomSync(myId: string, roomId: HalliRoomId) {
  const sref = sessionRef()
  try {
    await runTransaction(
      requireDb(),
      async (tx) => {
        const snap = await tx.get(sref)
        const data = snap.data() as SessionDoc
        if (!data.halliGames) data.halliGames = initialHalliGames()
        if (data.halliGames[roomId]) return
        const occ = data.roomOccupancy
        tx.update(sref, { roomOccupancy: { ...occ, [roomId]: (occ[roomId] ?? []).filter((id) => id !== myId) } })
      },
      HALLI_TX_OPTIONS,
    )
  } catch (err) {
    console.error('leaveHalliRoomSync 실패', err)
  }
}

/**
 * 불가가 "베팅 시작"을 누르면 그 순간 방에 있는 인원으로 참가자를 확정하고 배팅 단계로 들어간다.
 * seatOrder는 시계 방향 자리 순서(=뒤집기 차례 순서)이며, 1 라운드는 가나다순으로 정렬해
 * 클라이언트에서 미리 계산해 전달한다(카드게임 turnOrder와 동일한 패턴).
 */
export async function startHalliBettingSync(roomId: HalliRoomId, seatOrder: string[]) {
  const sref = sessionRef()
  try {
    await runTransaction(
      requireDb(),
      async (tx) => {
        const snap = await tx.get(sref)
        const data = snap.data() as SessionDoc
        if (!data.halliGames) data.halliGames = initialHalliGames()
        if (data.halliGames[roomId]) return
        const occ = data.roomOccupancy[roomId] ?? []
        if (occ.length < HALLI_ROOM_MIN_PLAYERS || occ.length > HALLI_ROOM_CAPACITY) return
        if (seatOrder.length !== occ.length || !seatOrder.every((id) => occ.includes(id))) return
        const game: HalliGameState = {
          status: 'betting',
          playerIds: seatOrder,
          bets: {},
          decks: {},
          revealed: {},
          roundCards: [],
          penaltyCards: [],
          eliminated: [],
          winnerId: null,
          pot: 0,
          log: [{ id: `hg-${Date.now()}`, kind: 'start', atMs: Date.now() }],
          turnIndex: 0,
        }
        tx.update(sref, { halliGames: { ...data.halliGames, [roomId]: game } })
      },
      HALLI_TX_OPTIONS,
    )
  } catch (err) {
    console.error('startHalliBettingSync 실패', err)
  }
}

/** 참가자 본인이 자기 코인 한도 내에서 배팅액을 정한다. */
export async function placeHalliBetSync(myId: string, roomId: HalliRoomId, amount: number) {
  const sref = sessionRef()
  try {
    await runTransaction(
      requireDb(),
      async (tx) => {
        const sSnap = await tx.get(sref)
        const data = sSnap.data() as SessionDoc
        if (!data.halliGames) data.halliGames = initialHalliGames()
        const game = data.halliGames[roomId]
        if (!game || game.status !== 'betting') return
        if (!game.playerIds.includes(myId)) return
        const pSnap = await tx.get(playerRef(myId))
        if (!pSnap.exists()) return
        const player = pSnap.data() as PlayerDoc
        if (amount < 1 || amount > player.coins) return
        const nextGame: HalliGameState = { ...game, bets: { ...game.bets, [myId]: Math.round(amount) } }
        tx.update(sref, { halliGames: { ...data.halliGames, [roomId]: nextGame } })
      },
      HALLI_TX_OPTIONS,
    )
  } catch (err) {
    console.error('placeHalliBetSync 실패', err)
  }
}

/** 전원이 배팅을 마치면, 불가가 카드를 나눠주고 실제 대전을 시작한다. */
export async function dealHalliGameSync(roomId: HalliRoomId) {
  const sref = sessionRef()
  try {
    await runTransaction(
      requireDb(),
      async (tx) => {
        const snap = await tx.get(sref)
        const data = snap.data() as SessionDoc
        if (!data.halliGames) data.halliGames = initialHalliGames()
        const game = data.halliGames[roomId]
        if (!game || game.status !== 'betting') return
        if (!game.playerIds.every((id) => game.bets[id] !== undefined)) return
        // 트랜잭션 규칙상 쓰기 전에 읽기를 전부 끝내야 하므로, 배팅자 전원의 코인 잔액을 먼저 읽어 둔다.
        const pSnaps = await Promise.all(game.playerIds.map((id) => tx.get(playerRef(id))))
        const deck = buildHalliDeck()
        const per = Math.floor(deck.length / game.playerIds.length)
        const decks: Record<string, HalliCard[]> = {}
        for (const id of game.playerIds) decks[id] = deck.splice(0, per)
        // 56장이 인원수로 나누어떨어지지 않으면 남는 카드를 무작위 한 명에게 더 준다.
        if (deck.length > 0) {
          const luckyId = game.playerIds[Math.floor(Math.random() * game.playerIds.length)]
          decks[luckyId] = [...decks[luckyId], ...deck]
        }
        const revealed: Record<string, HalliCard | null> = {}
        for (const id of game.playerIds) revealed[id] = null
        const pot = game.playerIds.reduce((sum, id) => sum + game.bets[id], 0)
        const nextGame: HalliGameState = {
          ...game,
          status: 'playing',
          decks,
          revealed,
          pot,
          log: [...game.log, { id: `hg-${Date.now()}-deal`, kind: 'flip', atMs: Date.now() }],
        }
        tx.update(sref, { halliGames: { ...data.halliGames, [roomId]: nextGame } })
        for (let i = 0; i < game.playerIds.length; i++) {
          const id = game.playerIds[i]
          const pSnap = pSnaps[i]
          if (!pSnap.exists()) continue
          const player = pSnap.data() as PlayerDoc
          tx.update(playerRef(id), { coins: Math.max(0, player.coins - game.bets[id]) })
        }
      },
      HALLI_TX_OPTIONS,
    )
  } catch (err) {
    console.error('dealHalliGameSync 실패', err)
  }
}

function halliEliminate(game: HalliGameState): HalliGameState {
  const eliminated = [...game.eliminated]
  for (const id of game.playerIds) {
    if (!eliminated.includes(id) && (game.decks[id] ?? []).length === 0 && !game.revealed[id]) {
      eliminated.push(id)
    }
  }
  return { ...game, eliminated }
}

export async function flipHalliCardSync(myId: string, roomId: HalliRoomId) {
  const sref = sessionRef()
  try {
    await runTransaction(
      requireDb(),
      async (tx) => {
        const snap = await tx.get(sref)
        const data = snap.data() as SessionDoc
        if (!data.halliGames) data.halliGames = initialHalliGames()
        const game = data.halliGames[roomId]
        if (!game || game.status !== 'playing') return
        if (game.eliminated.includes(myId)) return
        // 뒤집기는 시계 방향(playerIds 순서) 차례제다 — 지금 내 차례가 아니면 낼 수 없다.
        if (game.playerIds[game.turnIndex] !== myId) return
        const deck = game.decks[myId] ?? []
        if (deck.length === 0) return
        const [card, ...rest] = deck
        const nextDecks = { ...game.decks, [myId]: rest }
        const nextGame: HalliGameState = {
          ...game,
          decks: nextDecks,
          revealed: { ...game.revealed, [myId]: card },
          roundCards: [...game.roundCards, { playerId: myId, card }],
          turnIndex: settleHalliTurn(game.playerIds, game.eliminated, nextDecks, (game.turnIndex + 1) % game.playerIds.length),
          log: [
            ...game.log,
            { id: `hg-${Date.now()}-flip-${myId}`, kind: 'flip', actorId: myId, card, atMs: Date.now() },
          ],
        }
        tx.update(sref, { halliGames: { ...data.halliGames, [roomId]: nextGame } })
      },
      HALLI_TX_OPTIONS,
    )
  } catch (err) {
    console.error('flipHalliCardSync 실패', err)
  }
}

/**
 * '누르기'. 지금 공개된 카드들의 색깔별 합이 정확히 5인 색이 있으면, 가장 먼저 누른 사람이
 * 그 판의 카드(반납된 벌칙 카드 포함)를 전부 자기 덱 맨 뒤로 가져가고 다음 판이 시작된다.
 * 아니면 자기 덱 맨 위 카드 한 장을 반납한다(그 판을 이긴 사람에게 돌아간다). 그 결과 마지막
 * 한 명만 남으면 게임이 끝나고 배팅된 코인 전액을 그 사람에게 지급한다.
 */
export async function pressHalliBellSync(myId: string, roomId: HalliRoomId) {
  const sref = sessionRef()
  const meRef = playerRef(myId)
  try {
    await runTransaction(
      requireDb(),
      async (tx) => {
        // Firestore 트랜잭션은 쓰기 전에 읽기를 전부 끝내야 하므로, 게임이 끝나 코인을
        // 지급해야 할 경우를 대비해 내 플레이어 문서를 미리 읽어 둔다(실제로 쓸지는 아래에서 결정).
        const snap = await tx.get(sref)
        const meSnap = await tx.get(meRef)
        const data = snap.data() as SessionDoc
        if (!data.halliGames) data.halliGames = initialHalliGames()
        const game = data.halliGames[roomId]
        if (!game || game.status !== 'playing') return
        if (game.eliminated.includes(myId)) return
        const revealedList = game.playerIds.map((id) => game.revealed[id])
        const matchColor = findMatchingColor(revealedList)

        if (matchColor) {
          const collected = [...game.roundCards.map((rc) => rc.card), ...game.penaltyCards]
          const nextRevealed: Record<string, HalliCard | null> = {}
          for (const id of game.playerIds) nextRevealed[id] = null
          let nextGame: HalliGameState = {
            ...game,
            decks: { ...game.decks, [myId]: [...(game.decks[myId] ?? []), ...collected] },
            revealed: nextRevealed,
            roundCards: [],
            penaltyCards: [],
            // 이번 판을 이긴 사람이 다음 판의 첫 뒤집기 차례를 갖는다.
            turnIndex: game.playerIds.indexOf(myId),
            log: [
              ...game.log,
              {
                id: `hg-${Date.now()}-win`,
                kind: 'win',
                actorId: myId,
                color: matchColor,
                collected: collected.length,
                atMs: Date.now(),
              },
            ],
          }
          nextGame = halliEliminate(nextGame)
          // 방금 카드를 받은 나는 덱이 비어 있을 수 없으므로, 이 판에서 나 말고 아무도 남지
          // 않는다면 마지막 생존자는 항상 나 자신이다.
          const survivors = nextGame.playerIds.filter((id) => !nextGame.eliminated.includes(id))
          if (survivors.length <= 1 && meSnap.exists()) {
            nextGame = {
              ...nextGame,
              status: 'ended',
              winnerId: myId,
              log: [
                ...nextGame.log,
                { id: `hg-${Date.now()}-over`, kind: 'gameover', actorId: myId, atMs: Date.now() },
              ],
            }
            const mePlayer = meSnap.data() as PlayerDoc
            tx.update(sref, { halliGames: { ...data.halliGames, [roomId]: nextGame } })
            tx.update(meRef, { coins: mePlayer.coins + nextGame.pot })
            return
          }
          tx.update(sref, { halliGames: { ...data.halliGames, [roomId]: nextGame } })
          return
        }

        // 이미 그 판이 끝나(누군가 가져가서) 지금은 공개된 카드가 하나도 없는 상태라면,
        // 방금 판을 놓친 사람이 뒤늦게 누른 것일 뿐 진짜 오답이 아니므로 반납시키지 않는다.
        if (game.roundCards.length === 0) return

        // 잘못 눌렀다 — 자기 덱 맨 위 카드 한 장을 반납한다(있을 때만).
        const myDeck = game.decks[myId] ?? []
        if (myDeck.length === 0) return
        const [penalty, ...restDeck] = myDeck
        let nextGame: HalliGameState = {
          ...game,
          decks: { ...game.decks, [myId]: restDeck },
          penaltyCards: [...game.penaltyCards, penalty],
          log: [...game.log, { id: `hg-${Date.now()}-miss-${myId}`, kind: 'miss', actorId: myId, atMs: Date.now() }],
        }
        nextGame = halliEliminate(nextGame)
        // 지금 뒤집기 차례였던 사람이 방금 카드를 반납해 덱이 0장이 됐거나(탈락 여부와
        // 무관하게 더는 뒤집을 수 없다) 아예 탈락해 버렸다면, 낼 수 있는 다음 사람에게 넘긴다.
        {
          const settled = settleHalliTurn(nextGame.playerIds, nextGame.eliminated, nextGame.decks, nextGame.turnIndex)
          if (settled !== nextGame.turnIndex) nextGame = { ...nextGame, turnIndex: settled }
        }
        tx.update(sref, { halliGames: { ...data.halliGames, [roomId]: nextGame } })
      },
      HALLI_TX_OPTIONS,
    )
  } catch (err) {
    console.error('pressHalliBellSync 실패', err)
  }
}

/** 불가 전용: 게임을 초기화한다. 아직 끝나지 않았다면(승부 미결) 배팅한 코인을 전부 환불한다. */
export async function resetHalliGameSync(roomId: HalliRoomId) {
  const sref = sessionRef()
  try {
    await runTransaction(
      requireDb(),
      async (tx) => {
        const snap = await tx.get(sref)
        const data = snap.data() as SessionDoc
        if (!data.halliGames) data.halliGames = initialHalliGames()
        const game = data.halliGames[roomId]
        if (!game) return
        if (game.status === 'playing') {
          const pSnaps = await Promise.all(game.playerIds.map((id) => tx.get(playerRef(id))))
          tx.update(sref, { halliGames: { ...data.halliGames, [roomId]: null } })
          for (let i = 0; i < game.playerIds.length; i++) {
            const id = game.playerIds[i]
            const bet = game.bets[id]
            if (!bet) continue
            const pSnap = pSnaps[i]
            if (!pSnap.exists()) continue
            const player = pSnap.data() as PlayerDoc
            tx.update(playerRef(id), { coins: player.coins + bet })
          }
          return
        }
        tx.update(sref, { halliGames: { ...data.halliGames, [roomId]: null } })
      },
      HALLI_TX_OPTIONS,
    )
  } catch (err) {
    console.error('resetHalliGameSync 실패', err)
  }
}

/** 불가가 "플레이"를 누르면(2~5 명 사이일 때) 카드를 나눠 게임을 시작한다. */
export async function startCardGameSync(roomId: CardRoomId, turnOrder: string[]) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    if (!data.cardGames) data.cardGames = initialCardGames()
    const occ = data.roomOccupancy[roomId] ?? []
    if (occ.length < CARD_ROOM_MIN_PLAYERS || occ.length > CARD_ROOM_CAPACITY) return
    if (data.cardGames[roomId]) return
    if (turnOrder.length !== occ.length || !turnOrder.every((id) => occ.includes(id))) return
    const deck = shuffledCardDeck()
    const hands: Record<string, number[]> = {}
    for (const id of turnOrder) hands[id] = deck.splice(0, HAND_SIZE)
    const game: CardGameState = {
      status: 'playing',
      hands,
      drawPile: deck,
      pileAsc: 1,
      pileDesc: 100,
      turnOrder,
      turnIndex: 0,
      cardsPlayedThisTurn: 0,
      turnStartedAtMs: Date.now(),
      timeoutCount: 0,
      log: [{ id: `cg-${Date.now()}`, kind: 'start', atMs: Date.now() }],
    }
    tx.update(sref, { cardGames: { ...data.cardGames, [roomId]: game } })
  })
}

/** 카드를 나눠 가진 직후, 아직 아무도 카드를 내지 않았을 때만 불가가 첫 순서를
 * 다시 지정할 수 있다. 나머지는 기존 순서(가나다순)를 그대로 유지한 채 돌아간다. */
export async function setCardFirstPlayerSync(roomId: CardRoomId, firstPlayerId: string) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    if (!data.cardGames) data.cardGames = initialCardGames()
    const game = data.cardGames[roomId]
    if (!game || game.status !== 'playing') return
    if (game.log.some((e) => e.kind === 'play')) return
    if (!game.turnOrder.includes(firstPlayerId)) return
    const idx = game.turnOrder.indexOf(firstPlayerId)
    const nextGame: CardGameState = {
      ...game,
      turnOrder: [...game.turnOrder.slice(idx), ...game.turnOrder.slice(0, idx)],
      turnIndex: 0,
      turnStartedAtMs: Date.now(),
    }
    tx.update(sref, { cardGames: { ...data.cardGames, [roomId]: nextGame } })
  })
}

export async function playCardSync(myId: string, roomId: CardRoomId, pile: CardPile, card: number) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    if (!data.cardGames) data.cardGames = initialCardGames()
    const game = data.cardGames[roomId]
    if (!game || game.status !== 'playing') return
    if (game.turnOrder[game.turnIndex] !== myId) return
    const hand = game.hands[myId] ?? []
    if (!hand.includes(card)) return
    if (!isLegalCardPlay(card, game.pileAsc, game.pileDesc, pile)) return
    const nextHands = { ...game.hands, [myId]: hand.filter((c) => c !== card) }
    const nextPileAsc = pile === 'asc' ? card : game.pileAsc
    const nextPileDesc = pile === 'desc' ? card : game.pileDesc
    const playLog = {
      id: `cg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind: 'play' as const,
      actorId: myId,
      card,
      pile,
      atMs: Date.now(),
    }
    // 1 열/100 열은 갈수록 좁아지기만 하므로, 어느 순간 누군가의 손패가 통째로
    // 못 낼 카드로만 남으면 그 사람은 앞으로도 절대 낼 수 없다. 그 사람의 차례가
    // 될 때까지 기다리지 않고 이 순간 바로 패배 처리한다.
    const stuckPlayerId = game.turnOrder.find((id) => {
      const h = nextHands[id] ?? []
      return h.length > 0 && !hasAnyLegalCardMove(h, nextPileAsc, nextPileDesc)
    })
    if (stuckPlayerId) {
      const nextGame: CardGameState = {
        ...game,
        hands: nextHands,
        pileAsc: nextPileAsc,
        pileDesc: nextPileDesc,
        cardsPlayedThisTurn: game.cardsPlayedThisTurn + 1,
        status: 'lost',
        log: [
          ...game.log,
          playLog,
          {
            id: `cg-${Date.now()}-lose`,
            kind: 'lose',
            actorId: stuckPlayerId,
            reason: 'stuck',
            atMs: Date.now(),
          },
        ],
      }
      tx.update(sref, { cardGames: { ...data.cardGames, [roomId]: nextGame } })
      return
    }
    const nextGame: CardGameState = {
      ...game,
      hands: nextHands,
      pileAsc: nextPileAsc,
      pileDesc: nextPileDesc,
      cardsPlayedThisTurn: game.cardsPlayedThisTurn + 1,
      log: [...game.log, playLog],
    }
    tx.update(sref, { cardGames: { ...data.cardGames, [roomId]: nextGame } })
  })
}

/**
 * 한 차례를 마무리한다(수동 종료든 시간 초과 강제 종료든 공통). 덱에서 최대 2 장을
 * 보충하고, 승리/시간 초과 패배/막힘 패배를 순서대로 확인한 뒤, 아니면 다음 차례로 넘긴다.
 */
async function finishCardTurn(
  tx: Transaction,
  sref: DocumentReference,
  data: SessionDoc,
  roomId: CardRoomId,
  game: CardGameState,
  actingId: string,
  isTimeout: boolean,
) {
  // '더 게임' 규칙: 낸 만큼 그대로 보충해 손패가 항상 6 장으로 돌아온다(덱이 바닥나면 그만큼만).
  const drawCount = Math.min(game.cardsPlayedThisTurn, game.drawPile.length)
  const drawn = game.drawPile.slice(0, drawCount)
  const remainingDeck = game.drawPile.slice(drawCount)
  const nextHands = { ...game.hands, [actingId]: [...(game.hands[actingId] ?? []), ...drawn] }
  const totalHandCards = Object.values(nextHands).reduce((sum, h) => sum + h.length, 0)
  const nextTimeoutCount = isTimeout ? game.timeoutCount + 1 : game.timeoutCount

  const endLog = {
    id: `cg-${Date.now()}-end`,
    kind: 'endTurn' as const,
    actorId: actingId,
    deckLeft: remainingDeck.length,
    atMs: Date.now(),
    ...(isTimeout ? { reason: 'timeout' as const } : {}),
  }

  if (isTimeout && nextTimeoutCount >= CARD_TIMEOUT_STRIKES) {
    const loseLog = {
      id: `cg-${Date.now()}-lose`,
      kind: 'lose' as const,
      actorId: actingId,
      reason: 'timeout' as const,
      atMs: Date.now(),
    }
    const nextGame: CardGameState = {
      ...game,
      hands: nextHands,
      drawPile: remainingDeck,
      status: 'lost',
      timeoutCount: nextTimeoutCount,
      cardsPlayedThisTurn: 0,
      log: [...game.log, endLog, loseLog],
    }
    tx.update(sref, { cardGames: { ...data.cardGames, [roomId]: nextGame } })
    return
  }

  if (remainingDeck.length === 0 && totalHandCards === 0) {
    const winLog = { id: `cg-${Date.now()}-win`, kind: 'win' as const, atMs: Date.now() }
    const nextGame: CardGameState = {
      ...game,
      hands: nextHands,
      drawPile: remainingDeck,
      status: 'won',
      cardsPlayedThisTurn: 0,
      timeoutCount: nextTimeoutCount,
      log: [...game.log, endLog, winLog],
    }
    // 클리어 보상: 참여한 모두에게 코인 지급 (트랜잭션 규칙상 읽기를 먼저 전부 끝낸다).
    const playerSnaps = await Promise.all(game.turnOrder.map((id) => tx.get(playerRef(id))))
    tx.update(sref, { cardGames: { ...data.cardGames, [roomId]: nextGame } })
    for (let i = 0; i < game.turnOrder.length; i++) {
      const pSnap = playerSnaps[i]
      if (!pSnap.exists()) continue
      const pData = pSnap.data() as PlayerDoc
      tx.update(playerRef(game.turnOrder[i]), { coins: pData.coins + CARD_GAME_WIN_COINS })
    }
    return
  }

  const nextTurnIndex = (game.turnIndex + 1) % game.turnOrder.length
  const stuckPlayerId = game.turnOrder.find((id) => {
    const h = nextHands[id] ?? []
    return h.length > 0 && !hasAnyLegalCardMove(h, game.pileAsc, game.pileDesc)
  })

  if (stuckPlayerId) {
    const loseLog = {
      id: `cg-${Date.now()}-lose`,
      kind: 'lose' as const,
      actorId: stuckPlayerId,
      reason: 'stuck' as const,
      atMs: Date.now(),
    }
    const nextGame: CardGameState = {
      ...game,
      hands: nextHands,
      drawPile: remainingDeck,
      status: 'lost',
      turnIndex: nextTurnIndex,
      cardsPlayedThisTurn: 0,
      timeoutCount: nextTimeoutCount,
      log: [...game.log, endLog, loseLog],
    }
    tx.update(sref, { cardGames: { ...data.cardGames, [roomId]: nextGame } })
    return
  }

  const nextGame: CardGameState = {
    ...game,
    hands: nextHands,
    drawPile: remainingDeck,
    turnIndex: nextTurnIndex,
    cardsPlayedThisTurn: 0,
    timeoutCount: nextTimeoutCount,
    turnStartedAtMs: Date.now(),
    log: [...game.log, endLog],
  }
  tx.update(sref, { cardGames: { ...data.cardGames, [roomId]: nextGame } })
}

export async function endCardTurnSync(myId: string, roomId: CardRoomId) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    if (!data.cardGames) data.cardGames = initialCardGames()
    const game = data.cardGames[roomId]
    if (!game || game.status !== 'playing') return
    if (game.turnOrder[game.turnIndex] !== myId) return
    const requiredMin = game.drawPile.length > 0 ? MIN_PLAY_PER_TURN : 1
    if (game.cardsPlayedThisTurn < requiredMin) return
    await finishCardTurn(tx, sref, data, roomId, game, myId, false)
  })
}

/** 한 사람의 차례 제한 시간(3 분)이 지나면, 누군가의 화면이든 켜져 있는 클라이언트가
 * 대신 그 차례를 강제로 마무리한다(멱등적이라 여러 클라이언트가 동시에 감지해도 문제없다). */
export async function forceEndCardTurnSync(roomId: CardRoomId) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    if (!data.cardGames) data.cardGames = initialCardGames()
    const game = data.cardGames[roomId]
    if (!game || game.status !== 'playing') return
    if (Date.now() - game.turnStartedAtMs < CARD_TURN_TIME_LIMIT_MS) return
    const actingId = game.turnOrder[game.turnIndex]
    await finishCardTurn(tx, sref, data, roomId, game, actingId, true)
  })
}

export async function resetCardGameSync(roomId: CardRoomId) {
  await updateDoc(sessionRef(), { [`cardGames.${roomId}`]: null })
}

/** 크리처를 쓰러뜨린 뒤 유예 시간이 지나면 방을 비우고 조사 상태를 초기화한다. */
export async function forceCloseRoomSync(roomId: RoomId) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    if (!data.roomEvents[roomId]?.combat?.defeated) return
    const nextOccupancy = { ...data.roomOccupancy, [roomId]: [] }
    const nextEvents = {
      ...data.roomEvents,
      [roomId]: {
        event: null,
        cleared: false,
        clue: null,
        note: null,
        combat: null,
        open: data.roomEvents[roomId]?.open ?? false,
        investigation: data.roomEvents[roomId]?.investigation ?? { started: false, logIndex: 0, completed: false },
      },
    }
    tx.update(sref, { roomOccupancy: nextOccupancy, roomEvents: nextEvents })
  })
}

export async function sendRoomMessageSync(roomId: RoomId, msg: ChatMessage) {
  await updateDoc(sessionRef(), { [`roomMessages.${roomId}`]: arrayUnion(msg) })
}

export async function sendClassroomMessageSync(msg: ChatMessage) {
  await updateDoc(sessionRef(), { classroomMessages: arrayUnion(msg) })
}

export async function updateRoomEventSync(
  roomId: RoomId,
  updater: (state: RoomEventState) => RoomEventState,
) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    const current = data.roomEvents[roomId] ?? {
      event: null,
      cleared: false,
      clue: null,
      note: null,
      combat: null,
      open: false,
      investigation: { started: false, logIndex: 0, completed: false },
    }
    const withInvestigation: RoomEventState = {
      ...current,
      investigation: current.investigation ?? { started: false, logIndex: 0, completed: false },
    }
    const next = { ...data.roomEvents, [roomId]: updater(withInvestigation) }
    tx.update(sref, { roomEvents: next })
  })
}

export async function updateClassroomSync(updater: (state: ClassroomState) => ClassroomState) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    tx.update(sref, { classroom: updater(data.classroom) })
  })
}

export async function sendBroadcastSync(broadcast: Broadcast) {
  await updateDoc(sessionRef(), { broadcast })
}

export async function openMissionsSync(mission: MissionState) {
  await updateDoc(sessionRef(), { missionsOpen: true, mission: serializeMission(mission) })
}

export async function addClueSync(clue: ClueItem) {
  await updateDoc(sessionRef(), { collectedClues: arrayUnion(clue) })
}

export async function sendMissionMessageSync(msg: ChatMessage) {
  await updateDoc(sessionRef(), { missionMessages: arrayUnion(msg) })
}

export async function setDiscussionOpenSync(open: boolean) {
  await updateDoc(sessionRef(), {
    discussionOpen: open,
    discussionOpenedAt: open ? Date.now() : null,
  })
}

export async function updateMissionSync(updater: (state: MissionState) => MissionState) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.data() as SessionDoc
    const next = updater(deserializeMission(data.mission))
    tx.update(sref, { mission: serializeMission(next) })
  })
}

/** Runs an ability transaction that may read/write both the shared session doc and my own player doc. */
export async function runAbilityTransaction(
  myId: string,
  fn: (session: SessionDoc, player: PlayerDoc) => { session?: Partial<SessionDoc>; player?: Partial<PlayerDoc> },
) {
  const sref = sessionRef()
  const pref = playerRef(myId)
  try {
    await runTransaction(requireDb(), async (tx) => {
      const sSnap = await tx.get(sref)
      const pSnap = await tx.get(pref)
      if (!pSnap.exists()) return
      const rawSession = sSnap.data() as SessionDoc
      const session = { ...rawSession, mission: deserializeMission(rawSession.mission) }
      const player = pSnap.data() as PlayerDoc
      const { session: sessionPatch, player: playerPatch } = fn(session, player)
      if (sessionPatch) {
        tx.update(sref, sessionPatch.mission ? { ...sessionPatch, mission: serializeMission(sessionPatch.mission) } : sessionPatch)
      }
      if (playerPatch) tx.update(pref, playerPatch)
    })
  } catch (err) {
    // 게임 도중 문서 스키마가 늘어나는 등으로 이 트랜잭션 하나가 실패해도, 전역
    // unhandledrejection 핸들러(ErrorBoundary)가 이를 잡아 앱 전체를 크래시 화면으로
    // 튕겨 버리면 안 되므로 여기서 삼키고 로그만 남긴다.
    console.error('runAbilityTransaction 실패', err)
  }
}

/**
 * Runs a combat transaction: reads the shared session doc, the acting player's doc, and —
 * if pickTargetId returns an id — a second (retaliation) target player's doc, all before any
 * writes so Firestore's transaction rules are respected.
 */
export async function runCombatTransaction(
  myId: string,
  pickTargetId: (session: SessionDoc) => string | null,
  fn: (
    session: SessionDoc,
    me: PlayerDoc,
    target: PlayerDoc | null,
    targetId: string | null,
  ) => { session?: Partial<SessionDoc>; me?: Partial<PlayerDoc>; target?: Partial<PlayerDoc> },
) {
  const sref = sessionRef()
  const meRef = playerRef(myId)
  await runTransaction(requireDb(), async (tx) => {
    const sSnap = await tx.get(sref)
    const meSnap = await tx.get(meRef)
    if (!meSnap.exists()) return
    const rawSession = sSnap.data() as SessionDoc
    const session = { ...rawSession, mission: deserializeMission(rawSession.mission) }
    const me = meSnap.data() as PlayerDoc
    const targetId = pickTargetId(session)
    let target: PlayerDoc | null = null
    const targetRef = targetId && targetId !== myId ? playerRef(targetId) : null
    if (targetRef) {
      const tSnap = await tx.get(targetRef)
      target = tSnap.exists() ? (tSnap.data() as PlayerDoc) : null
    }
    const patch = fn(session, me, target, targetId)
    if (patch.session) {
      tx.update(sref, patch.session.mission ? { ...patch.session, mission: serializeMission(patch.session.mission) } : patch.session)
    }
    if (patch.me) tx.update(meRef, patch.me)
    if (patch.target && targetRef) tx.update(targetRef, patch.target)
  })
}

/**
 * Runs a hall-minigame resolution transaction: reads the shared session doc plus every
 * pending participant's player doc (a dynamic list read from the session itself), then lets
 * the caller decide the shared outcome and per-player patches in one atomic write.
 */
export async function runHallMinigameTransaction(
  objectId: string,
  fn: (
    session: SessionDoc,
    participants: Record<string, PlayerDoc>,
  ) => { session?: Partial<SessionDoc>; playerPatches?: Record<string, Partial<PlayerDoc>>; classroomMessage?: ChatMessage },
) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const sSnap = await tx.get(sref)
    const rawSession = sSnap.data() as SessionDoc
    const session = { ...rawSession, mission: deserializeMission(rawSession.mission) }
    const pendingIds = session.hallEvent.objectResults[objectId]?.minigamePending ?? []
    const playerSnaps = await Promise.all(pendingIds.map((id) => tx.get(playerRef(id))))
    const participants: Record<string, PlayerDoc> = {}
    playerSnaps.forEach((snap, i) => {
      if (snap.exists()) participants[pendingIds[i]] = snap.data() as PlayerDoc
    })
    const { session: sessionPatch, playerPatches, classroomMessage } = fn(session, participants)
    if (sessionPatch && classroomMessage) {
      tx.update(sref, {
        ...(sessionPatch.mission ? { ...sessionPatch, mission: serializeMission(sessionPatch.mission) } : sessionPatch),
        classroomMessages: arrayUnion(classroomMessage),
      })
    } else if (sessionPatch) {
      tx.update(sref, sessionPatch.mission ? { ...sessionPatch, mission: serializeMission(sessionPatch.mission) } : sessionPatch)
    } else if (classroomMessage) {
      tx.update(sref, { classroomMessages: arrayUnion(classroomMessage) })
    }
    if (playerPatches) {
      for (const [id, patch] of Object.entries(playerPatches)) {
        tx.update(playerRef(id), patch)
      }
    }
  })
}

/**
 * Runs a room-combat transaction: reads the shared session doc plus every current occupant's
 * player doc for that room (a dynamic list read from the session itself), so the caller can see
 * everyone's hp/stamina at once — needed to skip incapacitated players in turn order and to
 * redirect retaliation to whoever is defending.
 */
export async function runRoomCombatTransaction(
  roomId: RoomId,
  fn: (
    session: SessionDoc,
    occupants: Record<string, PlayerDoc>,
  ) => { session?: Partial<SessionDoc>; playerPatches?: Record<string, Partial<PlayerDoc>> },
) {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const sSnap = await tx.get(sref)
    const rawSession = sSnap.data() as SessionDoc
    const session = { ...rawSession, mission: deserializeMission(rawSession.mission) }
    const occupantIds = session.roomOccupancy[roomId] ?? []
    const playerSnaps = await Promise.all(occupantIds.map((id) => tx.get(playerRef(id))))
    const occupants: Record<string, PlayerDoc> = {}
    playerSnaps.forEach((snap, i) => {
      if (snap.exists()) occupants[occupantIds[i]] = snap.data() as PlayerDoc
    })
    const { session: sessionPatch, playerPatches } = fn(session, occupants)
    if (sessionPatch) {
      tx.update(sref, sessionPatch.mission ? { ...sessionPatch, mission: serializeMission(sessionPatch.mission) } : sessionPatch)
    }
    if (playerPatches) {
      for (const [id, patch] of Object.entries(playerPatches)) {
        tx.update(playerRef(id), patch)
      }
    }
  })
}

export async function createFeedPostSync(post: Omit<FeedPostDoc, 'createdAtMs' | 'heartedBy' | 'comments'>) {
  await addDoc(feedCol(), {
    ...post,
    heartedBy: [],
    comments: [],
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  })
}

export async function editFeedPostSync(postId: string, title: string, body: string) {
  await updateDoc(doc(feedCol(), postId), { title, body })
}

export async function deleteFeedPostSync(postId: string) {
  await deleteDoc(doc(feedCol(), postId))
}

export async function toggleHeartSync(postId: string, myId: string) {
  const pref = doc(feedCol(), postId)
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(pref)
    if (!snap.exists()) return
    const data = snap.data() as FeedPostDoc
    // 댓글/하트 기능이 추가되기 전에 만들어진 게시글은 heartedBy 필드 자체가 없을 수 있으므로 방어한다.
    const heartedBy = data.heartedBy ?? []
    const has = heartedBy.includes(myId)
    tx.update(pref, { heartedBy: has ? heartedBy.filter((id) => id !== myId) : [...heartedBy, myId] })
  })
}

export async function addCommentSync(postId: string, comment: FeedComment) {
  const pref = doc(feedCol(), postId)
  // 인원이 많은 실시간 게임에서 같은 게시글에 여러 명이 거의 동시에 댓글을 달면
  // Firestore 트랜잭션 내부 재시도만으로는 부족해 드물게 충돌로 실패할 수 있다.
  // 매 시도마다 최신 상태를 다시 읽는 트랜잭션이라 재시도해도 중복/유실 위험이
  // 없으므로, 여기서 한 번 더 겉에서 재시도해 순간적인 충돌을 흡수한다.
  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await runTransaction(requireDb(), async (tx) => {
        const snap = await tx.get(pref)
        if (!snap.exists()) return
        const data = snap.data() as FeedPostDoc
        if (!data.commentsEnabled) return
        // 댓글 기능이 추가되기 전에 만들어진 게시글은 comments 필드 자체가 없을 수 있으므로 방어한다.
        tx.update(pref, { comments: [...(data.comments ?? []), comment] })
      })
      return
    } catch (err) {
      lastErr = err
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)))
    }
  }
  throw lastErr
}

export async function editCommentSync(postId: string, commentId: string, authorId: string, text: string) {
  const pref = doc(feedCol(), postId)
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(pref)
    if (!snap.exists()) return
    const data = snap.data() as FeedPostDoc
    tx.update(pref, {
      comments: (data.comments ?? []).map((c) => (c.id === commentId && c.authorId === authorId ? { ...c, text } : c)),
    })
  })
}

export async function deleteCommentSync(postId: string, commentId: string, authorId: string) {
  const pref = doc(feedCol(), postId)
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(pref)
    if (!snap.exists()) return
    const data = snap.data() as FeedPostDoc
    tx.update(pref, {
      comments: (data.comments ?? []).filter((c) => !(c.id === commentId && c.authorId === authorId)),
    })
  })
}

export async function toggleCommentsEnabledSync(postId: string) {
  const pref = doc(feedCol(), postId)
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(pref)
    if (!snap.exists()) return
    const data = snap.data() as FeedPostDoc
    tx.update(pref, { commentsEnabled: !data.commentsEnabled })
  })
}

/** GM 전용: 가입 데이터(플레이어 문서), 모든 채팅 로그, 게시글을 전부 지우고 세션을 초기 상태로 되돌린다. */
export async function resetAllDataSync(): Promise<void> {
  const database = requireDb()
  const [playersSnap, feedSnap] = await Promise.all([getDocs(playersCol()), getDocs(feedCol())])
  const batch = writeBatch(database)
  for (const d of playersSnap.docs) batch.delete(d.ref)
  for (const d of feedSnap.docs) batch.delete(d.ref)
  batch.set(sessionRef(), defaultSessionState())
  await batch.commit()
}

/**
 * GM 전용: 조사(원정)를 지정한 차수 직전으로 되돌린다. 그 차수부터 지금까지 이미 기록된
 * 결과(성공/실패, 카드 수, 참가자 명단)를 전부 지우고 승수도 되돌린 뒤, 지정한 인물을
 * 그 차수의 조사대장으로 세워 propose 단계부터 다시 시작한다.
 */
export async function rollbackMissionSync(targetMissionIndex: number, leaderId: string): Promise<void> {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    if (!snap.exists()) return
    const data = snap.data() as SessionDoc
    const mission = deserializeMission(data.mission)
    if (targetMissionIndex < 0 || targetMissionIndex >= mission.missionResults.length) return
    if (targetMissionIndex > mission.missionIndex) return
    const leaderIdx = mission.turnOrder.indexOf(leaderId)
    if (leaderIdx < 0) return

    const missionResults = [...mission.missionResults]
    const failCounts = [...mission.failCounts]
    const teamHistory = [...mission.teamHistory]
    let wardWins = mission.wardWins
    let sinWins = mission.sinWins
    for (let i = mission.missionResults.length - 1; i >= targetMissionIndex; i--) {
      if (missionResults[i] === 'success') wardWins -= 1
      else if (missionResults[i] === 'fail') sinWins -= 1
      missionResults[i] = null
      failCounts[i] = null
      teamHistory[i] = null
    }

    const next: MissionState = {
      ...mission,
      missionIndex: targetMissionIndex,
      leaderIdx,
      phase: 'propose',
      proposedTeam: [],
      draftPreview: [],
      rejectionCount: 0,
      voteTally: null,
      cardTally: null,
      missionResults,
      failCounts,
      teamHistory,
      wardWins: Math.max(0, wardWins),
      sinWins: Math.max(0, sinWins),
      winner: null,
      lastNote: `불가가 ${targetMissionIndex + 1} 차 조사부터 다시 진행하도록 되돌렸다.`,
      shielded: false,
      phaseStartedAtMs: Date.now(),
      votes: {},
      cards: {},
    }
    tx.update(sref, { mission: serializeMission(next) })
  })
}

/**
 * GM 전용 일회성 보정: 수호 능력 버그로 CCTV 결과가 잘못 저장/전달됐던 과거 조사 한 건을
 * 바로잡는다. mission.failCounts[missionIndex]를 correctCount로 고치고, 이미 나가 있는
 * "《CCTV》 N 차 조사 — 실패 카드 X 장." 문구(공용 능력 로그 + 모든 플레이어의 개인 단서·
 * 불가 DM)를 찾아 그 조사에 한해 correctCount로 다시 써 준다.
 */
export async function fixCctvMissionRecordSync(missionIndex: number, correctCount: number): Promise<void> {
  const database = requireDb()
  const pattern = new RegExp(`(${missionIndex + 1} 차 조사 — 실패 카드 )\\d+( 장\\.)`)
  const replace = (text: string) => text.replace(pattern, `$1${correctCount}$2`)

  const sref = sessionRef()
  const sSnap = await getDoc(sref)
  if (sSnap.exists()) {
    const data = sSnap.data() as SessionDoc
    const mission = deserializeMission(data.mission)
    const failCounts = [...mission.failCounts]
    failCounts[missionIndex] = correctCount
    const abilityLog = (data.abilityLog ?? []).map((entry) =>
      entry.abilityName === 'CCTV' && pattern.test(entry.resultText)
        ? { ...entry, resultText: replace(entry.resultText) }
        : entry,
    )
    await updateDoc(sref, { mission: serializeMission({ ...mission, failCounts }), abilityLog })
  }

  const playersSnap = await getDocs(playersCol())
  const batch = writeBatch(database)
  for (const d of playersSnap.docs) {
    const data = d.data() as PlayerDoc
    let changed = false
    const personalClues = (data.personalClues ?? []).map((c) => {
      if (!pattern.test(c)) return c
      changed = true
      return replace(c)
    })
    const gmDmMessages = (data.gmDmMessages ?? []).map((m) => {
      if (!pattern.test(m.text)) return m
      changed = true
      return { ...m, text: replace(m.text) }
    })
    if (changed) batch.update(d.ref, { personalClues, gmDmMessages })
  }
  await batch.commit()
}

/**
 * GM 전용 일회성 보정: 출석부(기록자 능력)가 독립 역할(학생도 괴이도 아님)을 무조건
 * "괴이"로 잘못 표시하던 버그로 이미 나가 있는 과거 결과 텍스트를, 지정한 인물 이름에
 * 한해 "???"로 소급 정정한다. 《출석부》가 포함된 텍스트 안에서만 치환하므로 다른
 * 능력 로그는 건드리지 않는다.
 */
export async function fixRecordBookLabelSync(targetName: string): Promise<void> {
  const database = requireDb()
  const escaped = targetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(${escaped} = )(학생|괴이)`, 'g')
  const replace = (text: string) => (text.includes('《출석부》') ? text.replace(pattern, '$1???') : text)

  const sref = sessionRef()
  const sSnap = await getDoc(sref)
  if (sSnap.exists()) {
    const data = sSnap.data() as SessionDoc
    const abilityLog = (data.abilityLog ?? []).map((entry) =>
      entry.abilityName === '출석부' ? { ...entry, resultText: replace(entry.resultText) } : entry,
    )
    await updateDoc(sref, { abilityLog })
  }

  const playersSnap = await getDocs(playersCol())
  const batch = writeBatch(database)
  for (const d of playersSnap.docs) {
    const data = d.data() as PlayerDoc
    let changed = false
    const personalClues = (data.personalClues ?? []).map((c) => {
      const next = replace(c)
      if (next !== c) changed = true
      return next
    })
    const gmDmMessages = (data.gmDmMessages ?? []).map((m) => {
      const next = replace(m.text)
      if (next !== m.text) changed = true
      return next === m.text ? m : { ...m, text: next }
    })
    if (changed) batch.update(d.ref, { personalClues, gmDmMessages })
  }
  await batch.commit()
}

/**
 * GM 전용: N 일차가 지났다고 선언하고, 가입한 모든 플레이어에게 그날의 개인 서사를 한 번에 전달한다.
 * 1~4 일차 모두 각자 캐릭터의 개인화된 기억이며, 전체 전말 공개는 revealTruthSync가 별도로 담당한다.
 */
export async function revealStoryDaySync(day: 1 | 2 | 3 | 4): Promise<void> {
  const database = requireDb()
  const playersSnap = await getDocs(playersCol())
  const batch = writeBatch(database)
  for (const d of playersSnap.docs) {
    const character = CHARACTERS.find((c) => c.id === d.id)
    if (!character) continue
    const body =
      day === 1
        ? character.storyDay1
        : day === 2
          ? character.storyDay2
          : day === 3
            ? character.storyDay3
            : character.storyDay4
    const text = `《${day} 일차》 ${body}`
    const msg: ChatMessage = {
      id: `dm-${Date.now()}-${d.id}`,
      authorId: 'admin',
      text,
      time: '지금',
    }
    batch.update(d.ref, { gmDmMessages: arrayUnion(msg) })
  }
  batch.update(sessionRef(), { storyDay: day })
  await batch.commit()
}

/** GM 전용: 4 일차가 지난 뒤, 전말(《전말 — 열 번째 해》)을 모두에게 동일하게 공개한다. */
export async function revealTruthSync(): Promise<void> {
  const database = requireDb()
  const playersSnap = await getDocs(playersCol())
  const batch = writeBatch(database)
  for (const d of playersSnap.docs) {
    const msg: ChatMessage = {
      id: `dm-${Date.now()}-${d.id}`,
      authorId: 'admin',
      text: DAY4_REVEAL_TEXT,
      time: '지금',
    }
    batch.update(d.ref, { gmDmMessages: arrayUnion(msg) })
  }
  batch.update(sessionRef(), { truthRevealed: true })
  await batch.commit()
}

/** GM 전용: 최종 엔딩을 선택해 모든 플레이어에게 한 번에 전달한다. */
export async function sendEndingSync(key: EndingKey): Promise<void> {
  const database = requireDb()
  const playersSnap = await getDocs(playersCol())
  const batch = writeBatch(database)
  const body = ENDING_SCRIPTS[key]
  for (const d of playersSnap.docs) {
    const msg: ChatMessage = {
      id: `dm-${Date.now()}-${d.id}`,
      authorId: 'admin',
      text: body,
      time: '지금',
    }
    batch.update(d.ref, { gmDmMessages: arrayUnion(msg) })
  }
  batch.update(sessionRef(), { endingKey: key })
  await batch.commit()
}

/** 유출된 단서를(익명으로) 모든 플레이어의 개인 단서함에 한 번에 전달한다. */
export async function publishLeakSync(myId: string, leakId: string): Promise<string | null> {
  const database = requireDb()
  const pref = playerRef(myId)
  let leakText: string | null = null
  await runTransaction(database, async (tx) => {
    const snap = await tx.get(pref)
    if (!snap.exists()) return
    const player = snap.data() as PlayerDoc
    const entry = (player.leakLog ?? []).find((e) => e.id === leakId)
    if (!entry || entry.published) return
    leakText = entry.leakText
    const next = player.leakLog.map((e) => (e.id === leakId ? { ...e, published: true } : e))
    tx.update(pref, { leakLog: next })
  })
  if (!leakText) return null
  const playersSnap = await getDocs(playersCol())
  const batch = writeBatch(database)
  for (const d of playersSnap.docs) {
    batch.update(d.ref, { personalClues: arrayUnion(leakText) })
  }
  await batch.commit()
  return leakText
}

export function feedPostToFeedPost(id: string, doc: FeedPostDoc, myId: string): FeedPost {
  return {
    id,
    authorLabel: doc.authorLabel,
    tag: doc.tag,
    title: doc.title,
    body: doc.body,
    imageDataUrl: doc.imageDataUrl,
    time: doc.time,
    hearts: doc.heartedBy.length,
    heartedByViewer: doc.heartedBy.includes(myId),
    commentsEnabled: doc.commentsEnabled,
    comments: doc.comments,
  }
}
