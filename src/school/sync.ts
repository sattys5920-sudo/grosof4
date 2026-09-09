import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '../firebase'
import { roleById } from './data/roles'
import { assignRoles } from './engine/setup'
import type { ActionLogEntry, ChatMessage, GamePhase, PlayerProfile, RumorEntry, SchoolSessionState } from './types'

const SESSION_ID = 'live'

function requireDb(): Firestore {
  if (!db) throw new Error('firebase가 설정되지 않았다')
  return db
}

function sessionRef() {
  return doc(requireDb(), 'schoolSessions', SESSION_ID)
}

function playersCol() {
  return collection(requireDb(), 'schoolSessions', SESSION_ID, 'players')
}

function playerRef(playerId: string) {
  return doc(playersCol(), playerId)
}

const emptySession: SchoolSessionState = {
  phase: 'lobby',
  day: 1,
  rolesAssigned: false,
  groupChat: [],
  actionLog: [],
  rumors: [],
  activeEventCard: null,
  createdAtMs: Date.now(),
}

export async function ensureSchoolSessionInitialized(): Promise<void> {
  await runTransaction(requireDb(), async (tx) => {
    const snap = await tx.get(sessionRef())
    if (snap.exists()) return
    tx.set(sessionRef(), emptySession)
  })
}

export function subscribeSchoolSession(cb: (state: SchoolSessionState) => void): Unsubscribe {
  return onSnapshot(sessionRef(), (snap) => {
    if (!snap.exists()) {
      cb(emptySession)
      return
    }
    cb(snap.data() as SchoolSessionState)
  })
}

export function subscribeSchoolPlayers(cb: (players: Record<string, PlayerProfile>) => void): Unsubscribe {
  return onSnapshot(playersCol(), (snap) => {
    const players: Record<string, PlayerProfile> = {}
    snap.forEach((d) => {
      players[d.id] = d.data() as PlayerProfile
    })
    cb(players)
  })
}

export async function joinSchoolSession(playerId: string, nickname: string, isHost: boolean): Promise<void> {
  const profile: PlayerProfile = {
    id: playerId,
    nickname,
    joinedAtMs: Date.now(),
    roleId: null,
    isHost,
    missionChecks: [],
    hiddenGoalResolution: null,
    endingKey: null,
    endingNote: null,
  }
  await setDoc(playerRef(playerId), profile, { merge: true })
}

/** 진행자 전용: 지금 모인 인원으로 역할을 자동 배정하고 역할 공개 단계로 넘긴다. */
export async function assignRolesAndReveal(playerIds: string[]): Promise<void> {
  const assignment = assignRoles(playerIds)
  await runTransaction(requireDb(), async (tx) => {
    for (const playerId of playerIds) {
      const roleId = assignment[playerId]
      const checklistLength = roleById[roleId].mission.checklist.length
      tx.update(playerRef(playerId), {
        roleId,
        missionChecks: new Array(checklistLength).fill(false),
      })
    }
    tx.update(sessionRef(), { rolesAssigned: true, phase: 'roleReveal' satisfies GamePhase })
  })
}

export async function setSchoolPhase(phase: GamePhase): Promise<void> {
  await updateDoc(sessionRef(), { phase })
}

export async function advanceSchoolDay(nextDay: number, eventCard: string | null): Promise<void> {
  await updateDoc(sessionRef(), { day: nextDay, activeEventCard: eventCard, phase: 'day' satisfies GamePhase })
}

export async function setActiveEventCard(eventCard: string | null): Promise<void> {
  await updateDoc(sessionRef(), { activeEventCard: eventCard })
}

export async function postGroupChatMessage(message: ChatMessage): Promise<void> {
  await updateDoc(sessionRef(), { groupChat: arrayUnion(message) })
}

export async function logSchoolAction(entry: ActionLogEntry): Promise<void> {
  await updateDoc(sessionRef(), { actionLog: arrayUnion(entry) })
}

export async function addSchoolRumor(rumor: RumorEntry): Promise<void> {
  await updateDoc(sessionRef(), { rumors: arrayUnion(rumor) })
}

export async function setMissionChecks(playerId: string, missionChecks: boolean[]): Promise<void> {
  await updateDoc(playerRef(playerId), { missionChecks })
}

export async function setHiddenGoalResolution(playerId: string, text: string): Promise<void> {
  await updateDoc(playerRef(playerId), { hiddenGoalResolution: text })
}

export async function setPlayerEnding(playerId: string, endingKey: string, endingNote: string | null): Promise<void> {
  await updateDoc(playerRef(playerId), { endingKey, endingNote })
}

/** 진행자 전용: 다음 회차를 위해 세션과 참가자를 모두 지운다. */
export async function resetSchoolSession(): Promise<void> {
  const players = await getDocs(playersCol())
  await Promise.all(players.docs.map((d) => deleteDoc(d.ref)))
  await setDoc(sessionRef(), { ...emptySession, createdAtMs: Date.now() })
}
