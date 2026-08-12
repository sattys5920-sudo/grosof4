import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { db } from '../firebase'
import { CHARACTERS, ROOMS } from '../data/characters'
import type {
  Broadcast,
  ChatMessage,
  ClassroomState,
  FeedComment,
  FeedPost,
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
  erosionTargetId: string | null
  disguiseArmed: boolean
  collectedClues: ClueItem[]
  missionMessages: ChatMessage[]
  discussionOpen: boolean
  discussionOpenedAt: number | null
  shopOpen: boolean
}

export interface PlayerDoc {
  nickname: string
  grade: string
  photo: string | null
  abilityUnlocked: boolean
  abilityUseCount: number
  personalClues: string[]
  gmDmMessages: ChatMessage[]
  hp: number
  stamina: number
  coins: number
  weaponAtkBonus: number
  armorDefBonus: number
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
    erosionTargetId: null,
    disguiseArmed: false,
    shopOpen: false,
    collectedClues: [],
    missionMessages: [],
    discussionOpen: false,
    discussionOpenedAt: null,
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

export async function ensureSessionInitialized(): Promise<void> {
  const sref = sessionRef()
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    if (snap.exists()) return
    tx.set(sref, defaultSessionState())
  })
}

export function subscribeSession(cb: (data: SessionDoc) => void) {
  return onSnapshot(sessionRef(), (snap) => {
    if (!snap.exists()) return
    cb(snap.data() as SessionDoc)
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

/** Assigns the caller a random unclaimed character slot (or admin). Returns the character id. */
export async function claimRandomSlot(
  nickname: string,
  grade: string,
  photo: string | null,
): Promise<string> {
  const sref = sessionRef()
  return runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sref)
    const data = snap.exists() ? (snap.data() as SessionDoc) : defaultSessionState()
    const claimed = data.claimedSlots ?? []
    const pool = CHARACTERS.filter((c) => !claimed.includes(c.id))
    const available = pool.length > 0 ? pool : CHARACTERS
    const assigned = available[Math.floor(Math.random() * available.length)]
    if (!snap.exists()) {
      tx.set(sref, { ...defaultSessionState(), claimedSlots: [assigned.id] })
    } else {
      tx.update(sref, { claimedSlots: arrayUnion(assigned.id) })
    }
    const pref = playerRef(assigned.id)
    tx.set(pref, {
      nickname: nickname.trim() || assigned.name,
      grade,
      photo,
      abilityUnlocked: true,
      abilityUseCount: 0,
      personalClues: [],
      gmDmMessages: [],
      hp: 100,
      stamina: 100,
      coins: 0,
      weaponAtkBonus: 0,
      armorDefBonus: 0,
    })
    return assigned.id
  })
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
      abilityUnlocked: true,
      abilityUseCount: 0,
      personalClues: [],
      gmDmMessages: [],
      hp: 100,
      stamina: 100,
      coins: 0,
      weaponAtkBonus: 0,
      armorDefBonus: 0,
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
  await updateDoc(sessionRef(), { missionsOpen: true, mission })
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
    tx.update(sref, { mission: updater(data.mission) })
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
    const session = sSnap.data() as SessionDoc
    const player = pSnap.data() as PlayerDoc
    const { session: sessionPatch, player: playerPatch } = fn(session, player)
    if (sessionPatch) tx.update(sref, sessionPatch)
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
    const session = sSnap.data() as SessionDoc
    const me = meSnap.data() as PlayerDoc
    const targetId = pickTargetId(session)
    let target: PlayerDoc | null = null
    const targetRef = targetId && targetId !== myId ? playerRef(targetId) : null
    if (targetRef) {
      const tSnap = await tx.get(targetRef)
      target = tSnap.exists() ? (tSnap.data() as PlayerDoc) : null
    }
    const patch = fn(session, me, target, targetId)
    if (patch.session) tx.update(sref, patch.session)
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
