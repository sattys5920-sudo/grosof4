import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { db } from '../firebase'
import { CHARACTERS, DAY4_REVEAL_TEXT, ENDING_SCRIPTS, ROOMS } from '../data/characters'
import type {
  Broadcast,
  ChatMessage,
  ClassroomState,
  EndingKey,
  FeedComment,
  FeedPost,
  HallEventState,
  RoomEventState,
  RoomId,
} from '../data/types'
import { initialMissionState, type MissionState } from './missionEngine'

const SESSION_ID = 'live'

export interface ClueItem {
  id: string
  title: string
  text: string
  source: string
  icon?: string | null
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
  disguiseArmed: boolean
  collectedClues: ClueItem[]
  missionMessages: ChatMessage[]
  discussionOpen: boolean
  discussionOpenedAt: number | null
  shopOpen: boolean
  classroomOpen: boolean
  hallEvent: HallEventState
  storyDay: 0 | 1 | 2 | 3 | 4
  truthRevealed: boolean
  endingKey: EndingKey | null
}

export interface PlayerDoc {
  nickname: string
  grade: string
  photo: string | null
  profileComplete: boolean
  abilityUnlocked: boolean
  abilityUseCount: number
  lastDiscernDate: string | null
  personalClues: string[]
  gmDmMessages: ChatMessage[]
  hp: number
  stamina: number
  coins: number
  weaponAtkBonus: number
  armorDefBonus: number
  inventory: Record<string, number>
}

export interface FeedPostDoc {
  authorLabel: string
  tag: string
  title: string
  body: string
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
}

const INITIAL_ROOM_MESSAGES: Record<RoomId, ChatMessage[]> = {
  library: [],
  infirmary: [],
  broadcast: [],
  rooftop: [],
}

function initialRoomEvents(): Record<RoomId, RoomEventState> {
  const result = {} as Record<RoomId, RoomEventState>
  for (const room of ROOMS) {
    result[room.id] = { event: null, cleared: false, clue: null, note: null, combat: null }
  }
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
    disguiseArmed: false,
    shopOpen: false,
    classroomOpen: true,
    hallEvent: {
      eventId: null,
      logIndex: 0,
      objectIndex: 0,
      objectResults: {},
      startedAtMs: null,
      completedEventIds: [],
    },
    collectedClues: [],
    missionMessages: [],
    discussionOpen: false,
    discussionOpenedAt: null,
    storyDay: 0,
    truthRevealed: false,
    endingKey: null,
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
  const rawHistory = raw.teamHistory as unknown as ({ team: string[] } | string[] | null)[]
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
    cb({ ...data, mission: deserializeMission(data.mission) })
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
      personalClues: [],
      gmDmMessages: [],
      hp: 100,
      stamina: 100,
      coins: 0,
      weaponAtkBonus: 0,
      armorDefBonus: 0,
      inventory: {},
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

/** 불가 전용: 캐릭터 자리와 무관하게 별도의 아이디/비밀번호 계정을 새로 만든다. */
export async function registerAdminAccountSync(username: string, password: string): Promise<void> {
  const uname = username.trim().toLowerCase()
  if (!uname || !password) throw new Error('아이디와 비밀번호를 모두 입력해야 한다.')
  const passwordHash = await hashPassword(password)
  const aref = accountRef(uname)
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(aref)
    if (snap.exists()) throw new Error('이미 사용 중인 아이디다.')
    const account: AccountDoc = { passwordHash, characterId: null, isAdmin: true, createdAtMs: Date.now() }
    tx.set(aref, account)
  })
}

/** 불가 전용: 아이디/비밀번호로 관리자 계정에 로그인한다. */
export async function loginAdminAccountSync(username: string, password: string): Promise<void> {
  const uname = username.trim().toLowerCase()
  if (!uname || !password) throw new Error('아이디와 비밀번호를 모두 입력해야 한다.')
  const aSnap = await getDoc(accountRef(uname))
  if (!aSnap.exists()) throw new Error('존재하지 않는 아이디다.')
  const account = aSnap.data() as AccountDoc
  if (!account.isAdmin) throw new Error('불가 계정이 아니다.')
  const passwordHash = await hashPassword(password)
  if (passwordHash !== account.passwordHash) throw new Error('비밀번호가 일치하지 않는다.')
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
      personalClues: [],
      gmDmMessages: [],
      hp: 100,
      stamina: 100,
      coins: 0,
      weaponAtkBonus: 0,
      armorDefBonus: 0,
      inventory: {},
    })
  })
}

export async function patchPlayer(characterId: string, patch: Partial<PlayerDoc>) {
  await updateDoc(playerRef(characterId), patch)
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
    const occ = data.roomOccupancy
    const capacity = ROOMS.find((r) => r.id === roomId)!.capacity
    if ((occ[roomId] ?? []).length >= capacity) return
    const next: Record<RoomId, string[]> = { ...occ }
    for (const room of ROOMS) {
      if (room.id !== roomId) next[room.id] = (next[room.id] ?? []).filter((id) => id !== myId)
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
    const next = { ...data.roomEvents, [roomId]: updater(data.roomEvents[roomId]) }
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

export async function createFeedPostSync(post: Omit<FeedPostDoc, 'createdAtMs' | 'heartedBy' | 'comments'>) {
  await addDoc(feedCol(), {
    ...post,
    heartedBy: [],
    comments: [],
    createdAtMs: Date.now(),
    createdAt: serverTimestamp(),
  })
}

export async function toggleHeartSync(postId: string, myId: string) {
  const pref = doc(feedCol(), postId)
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(pref)
    if (!snap.exists()) return
    const data = snap.data() as FeedPostDoc
    const has = data.heartedBy.includes(myId)
    tx.update(pref, { heartedBy: has ? data.heartedBy.filter((id) => id !== myId) : [...data.heartedBy, myId] })
  })
}

export async function addCommentSync(postId: string, comment: FeedComment) {
  const pref = doc(feedCol(), postId)
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(pref)
    if (!snap.exists()) return
    const data = snap.data() as FeedPostDoc
    if (!data.commentsEnabled) return
    tx.update(pref, { comments: [...data.comments, comment] })
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

export function feedPostToFeedPost(id: string, doc: FeedPostDoc, myId: string): FeedPost {
  return {
    id,
    authorLabel: doc.authorLabel,
    tag: doc.tag,
    title: doc.title,
    body: doc.body,
    time: doc.time,
    hearts: doc.heartedBy.length,
    heartedByViewer: doc.heartedBy.includes(myId),
    commentsEnabled: doc.commentsEnabled,
    comments: doc.comments,
  }
}
