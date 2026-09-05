// Firestore와 엮인 방 생성/입장/준비/시작/턴 진행 함수. 게임 본편 상태
// (장소, 생존자, 위기 등)는 각 STEP에서 이 문서에 이어 붙인다.
import { doc, getDoc, setDoc, updateDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db, ensureSignedIn, SignInFailedError } from '../firebase'
import {
  generateRoomCode,
  allReady,
  advanceTurn,
  dealSurvivors,
  rollAllPlayerDice,
  initialDiceUsed,
  consumeAnyDie,
  applySurvivorMove,
  buildAllItemDecks,
  drawFromDeck,
} from './logic'
import { SURVIVORS, SURVIVOR_MAP } from './survivors'
import { itemsForLocation, ITEM_TYPE_MAP } from './items'
import { MAX_PLAYERS, type LocationId, type LogEntry, type RoomDoc, type SearchableLocationId } from './types'

const SEARCHABLE_LOCATIONS: SearchableLocationId[] = ['police', 'grocery', 'school', 'gasStation', 'library', 'hospital']

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
  const survivors = dealSurvivors(room.players, SURVIVORS)
  const dice = rollAllPlayerDice(room.players, survivors)
  const itemDecks = buildAllItemDecks(SEARCHABLE_LOCATIONS, itemsForLocation)
  await updateDoc(roomRef(code), {
    phase: 'playing',
    round: 1,
    turnOrder,
    firstPlayerIndex: 0,
    currentPlayerIndex: 0,
    roundPhase: 'turns',
    survivors,
    dice,
    diceUsed: initialDiceUsed(dice),
    itemDecks,
    itemsByPlayer: Object.fromEntries(room.players.map((p) => [p.uid, []])),
    log: [nowLog('생존자들이 콜로니에 모였습니다. 1라운드를 시작합니다.')],
  })
}

function requireMyTurn(room: RoomDoc, uid: string): asserts room is RoomDoc & { turnOrder: string[]; currentPlayerIndex: number } {
  if (!room.turnOrder || room.currentPlayerIndex === undefined) throw new Error('아직 게임이 시작되지 않았어요.')
  if (room.turnOrder[room.currentPlayerIndex] !== uid) throw new Error('지금은 당신의 턴이 아니에요.')
}

/** 생존자 한 명을 다른 장소로 옮긴다(섹션 6 이동). 주사위를 하나 쓴다 —
 * 노출 판정은 STEP 7(좀비·노출)에서 이어서 구현한다. */
export async function moveSurvivor(
  code: string,
  room: RoomDoc,
  uid: string,
  survivorId: string,
  destination: LocationId,
): Promise<void> {
  requireMyTurn(room, uid)
  const diceUsed = room.diceUsed?.[uid]
  if (!diceUsed) throw new Error('주사위 정보를 찾을 수 없어요.')
  const consumed = consumeAnyDie(diceUsed)
  if (!consumed) throw new Error('남은 주사위가 없어요.')

  const survivors = applySurvivorMove(room.survivors ?? [], survivorId, uid, destination)
  const survivorName = SURVIVOR_MAP[survivorId]?.name ?? '생존자'
  const playerName = room.players.find((p) => p.uid === uid)?.name ?? '생존자'

  await updateDoc(roomRef(code), {
    survivors,
    [`diceUsed.${uid}`]: consumed.nextDiceUsed,
    log: [...(room.log ?? []), nowLog(`${playerName}의 ${survivorName}이(가) 이동했습니다.`)],
  })
}

/** 지금 있는 장소를 탐색한다(섹션 6 탐색). 콜로니는 탐색 대상이 아니다.
 * 카드가 남아있지 않아도 주사위는 소모된다. */
export async function searchLocation(code: string, room: RoomDoc, uid: string, survivorId: string): Promise<void> {
  requireMyTurn(room, uid)
  const survivor = room.survivors?.find((s) => s.survivorId === survivorId)
  if (!survivor) throw new Error('생존자를 찾을 수 없어요.')
  if (survivor.ownerUid !== uid) throw new Error('내 생존자가 아니에요.')
  if (!survivor.alive) throw new Error('이미 죽은 생존자예요.')
  if (survivor.locationId === 'colony') throw new Error('콜로니에서는 탐색할 수 없어요.')

  const diceUsed = room.diceUsed?.[uid]
  if (!diceUsed) throw new Error('주사위 정보를 찾을 수 없어요.')
  const consumed = consumeAnyDie(diceUsed)
  if (!consumed) throw new Error('남은 주사위가 없어요.')

  const deck = room.itemDecks?.[survivor.locationId] ?? []
  const { drawn, remaining } = drawFromDeck(deck)
  const playerName = room.players.find((p) => p.uid === uid)?.name ?? '생존자'
  const itemName = drawn ? (ITEM_TYPE_MAP[drawn]?.name ?? drawn) : null

  await updateDoc(roomRef(code), {
    [`itemDecks.${survivor.locationId}`]: remaining,
    ...(drawn ? { [`itemsByPlayer.${uid}`]: [...(room.itemsByPlayer?.[uid] ?? []), drawn] } : {}),
    [`diceUsed.${uid}`]: consumed.nextDiceUsed,
    log: [
      ...(room.log ?? []),
      nowLog(drawn ? `${playerName}이(가) 탐색해서 ${itemName}을(를) 찾았습니다.` : `${playerName}이(가) 탐색했지만 아무것도 찾지 못했습니다.`),
    ],
  })
}

/** 지금 턴인 사람만 호출 가능. 순서상 마지막 사람이었다면 라운드 단계를
 * 'colony'로 넘긴다 — 실제 콜로니 단계 처리는 STEP 8~9에서 구현한다. */
export async function endTurn(code: string, room: RoomDoc, uid: string): Promise<void> {
  requireMyTurn(room, uid)
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
