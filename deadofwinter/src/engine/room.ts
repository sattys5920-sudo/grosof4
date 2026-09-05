// Firestore와 엮인 방 생성/입장/준비/시작/턴 진행 함수. 게임 본편 상태
// (장소, 생존자, 위기 등)는 각 STEP에서 이 문서에 이어 붙인다.
import { doc, getDoc, setDoc, updateDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db, ensureSignedIn, SignInFailedError } from '../firebase'
import { generateRoomCode, allReady, advanceTurn } from './logic'
import { MAX_PLAYERS, type LogEntry, type RoomDoc } from './types'

const ROOMS = 'deadofwinterRooms'

/** 로그인 실패 사유를 사람이 읽을 수 있는 안내로 바꾼다. */
async function requireUid(): Promise<string> {
  if (!db) throw new Error('Firebase 설정이 없어요. 배포 설정을 확인해 주세요.')
  try {
    const uid = await ensureSignedIn()
    if (!uid) throw new Error('Firebase 설정이 없어요. 배포 설정을 확인해 주세요.')
    return uid
  } catch (err) {
    if (err instanceof SignInFailedError) {
      throw new Error(
        `익명 로그인에 실패했어요 (${err.code}). Firebase 콘솔 → Authentication → Sign-in method에서 "익명(Anonymous)" 로그인을 켰는지 확인해 주세요.`,
      )
    }
    throw err
  }
}

function roomRef(code: string) {
  if (!db) throw new Error('오프라인 상태예요.')
  return doc(db, ROOMS, code)
}

/** 새 방을 만든다. 만든 사람이 자동으로 첫 번째 슬롯(방장)에 들어간다. */
export async function createRoom(name: string): Promise<string> {
  const uid = await requireUid()

  let code = generateRoomCode()
  for (let tries = 0; tries < 5; tries++) {
    const snap = await getDoc(roomRef(code))
    if (!snap.exists()) break
    code = generateRoomCode()
  }

  const room: RoomDoc = {
    code,
    createdAt: Date.now(),
    hostUid: uid,
    phase: 'lobby',
    players: [{ uid, name: name.trim() || '생존자', ready: false }],
  }
  await setDoc(roomRef(code), room)
  return code
}

/** 초대 코드로 빈 슬롯에 들어간다. 이미 들어가 있던 uid면 그 자리를 그대로
 * 돌려준다(새로고침 대비). 4명이 꽉 찼거나 방이 없으면 null. */
export async function joinRoom(code: string, name: string): Promise<RoomDoc | null> {
  const uid = await requireUid()
  const upper = code.trim().toUpperCase()
  const ref = roomRef(upper)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const room = snap.data() as RoomDoc

  if (room.players.some((p) => p.uid === uid)) return room
  if (room.players.length >= MAX_PLAYERS) return null
  if (room.phase !== 'lobby') return null

  const nextPlayers = [...room.players, { uid, name: name.trim() || '생존자', ready: false }]
  await updateDoc(ref, { players: nextPlayers })
  return { ...room, players: nextPlayers }
}

export function watchRoom(code: string, onChange: (room: RoomDoc | null) => void): Unsubscribe {
  return onSnapshot(roomRef(code), (snap) => onChange(snap.exists() ? (snap.data() as RoomDoc) : null))
}

/** 내 준비 상태를 토글한다. */
export async function toggleReady(code: string, room: RoomDoc, uid: string): Promise<void> {
  const nextPlayers = room.players.map((p) => (p.uid === uid ? { ...p, ready: !p.ready } : p))
  await updateDoc(roomRef(code), { players: nextPlayers })
}

function nowLog(text: string): LogEntry {
  return { at: Date.now(), text }
}

/** 방장만 호출 가능. 4명 전원 준비된 상태여야 시작한다. 턴 순서는 로비에
 * 모인 순서 그대로 고정하고, 방장이 1라운드 선 플레이어가 된다 — 장소·
 * 생존자·위기 같은 게임 본편 상태는 STEP 3~9에서 이 시점에 함께 채운다. */
export async function startGame(code: string, room: RoomDoc): Promise<void> {
  if (!allReady(room.players, MAX_PLAYERS)) throw new Error('4명 전원이 준비되어야 시작할 수 있어요.')
  const turnOrder = room.players.map((p) => p.uid)
  await updateDoc(roomRef(code), {
    phase: 'playing',
    round: 1,
    turnOrder,
    firstPlayerIndex: 0,
    currentPlayerIndex: 0,
    roundPhase: 'turns',
    log: [nowLog('생존자들이 콜로니에 모였습니다. 1라운드를 시작합니다.')],
  })
}

/** 지금 턴인 사람만 호출 가능. 순서상 마지막 사람이었다면 라운드 단계를
 * 'colony'로 넘긴다 — 실제 콜로니 단계 처리는 STEP 8~9에서 구현한다. */
export async function endTurn(code: string, room: RoomDoc, uid: string): Promise<void> {
  if (!room.turnOrder || room.currentPlayerIndex === undefined) throw new Error('아직 게임이 시작되지 않았어요.')
  if (room.turnOrder[room.currentPlayerIndex] !== uid) throw new Error('지금은 당신의 턴이 아니에요.')

  const name = room.players.find((p) => p.uid === uid)?.name ?? '생존자'
  const { nextPlayerIndex, roundOver } = advanceTurn(room.turnOrder, room.currentPlayerIndex)
  const log = [...(room.log ?? []), nowLog(`${name}의 턴이 끝났습니다.`)]

  if (roundOver) {
    await updateDoc(roomRef(code), {
      roundPhase: 'colony',
      currentPlayerIndex: nextPlayerIndex,
      log: [...log, nowLog('전원의 턴이 끝났습니다. 콜로니 단계로 넘어갑니다.')],
    })
    return
  }

  await updateDoc(roomRef(code), { currentPlayerIndex: nextPlayerIndex, log })
}
