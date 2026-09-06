// 아브라카왓 온라인 대전의 Firestore 방/행동 함수. sherlock13Rooms와
// 완전히 분리된 컬렉션(abracaRooms)을 쓴다 — 문서 모양이 아예 다르고,
// 보안 규칙도 반대 방향(자기 손패는 자기가 못 읽음)이라 섞으면
// 헷갈린다.
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, type Unsubscribe } from 'firebase/firestore'
import { db, ensureSignedIn, SignInFailedError } from '../firebase'
import { generateRoomCode } from './logic'
import { DIFFICULTY_CONFIG, SPELL_MAP, pickActiveSpells, rollHandCounts, resolveDeclare } from './abracawhat'
import type { Difficulty, SpellId } from './abracawhat'
import type { AbracaDeclareLogEntry, AbracaHandDoc, AbracaRole, AbracaRoomDoc } from './abracaTypes'
import type { LogEntry } from './types'

const ROOMS = 'abracaRooms'

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
function privateRef(code: string, who: AbracaRole) {
  if (!db) throw new Error('오프라인 상태예요.')
  return doc(collection(roomRef(code), 'private'), who)
}

function nowLog(text: string): LogEntry {
  return { at: Date.now(), text }
}

function otherRole(role: AbracaRole): AbracaRole {
  return role === 'host' ? 'guest' : 'host'
}

/** 새 방을 만든다. 이 시점엔 게스트가 없으니 "게스트의 손패"만 미리
 * 배분해 둘 수 있다(호스트가 게스트 손패 문서에 쓸 권한이 있음) — 내
 * 손패(호스트 자신 것)는 내가 못 만지므로, 게스트가 들어올 때
 * joinAbracaRoom에서 게스트가 대신 배분한다. */
export async function createAbracaRoom(hostName: string, difficulty: Difficulty): Promise<string> {
  const uid = await requireUid()

  let code = generateRoomCode()
  for (let tries = 0; tries < 5; tries++) {
    const snap = await getDoc(roomRef(code))
    if (!snap.exists()) break
    code = generateRoomCode()
  }

  const cfg = DIFFICULTY_CONFIG[difficulty]
  const activeSpellIds = pickActiveSpells(cfg.spellTypeCount)
  const guestHand: AbracaHandDoc = { remaining: rollHandCounts(activeSpellIds, cfg.tilesPerPlayer) }

  const room: AbracaRoomDoc = {
    code,
    createdAt: Date.now(),
    hostUid: uid,
    guestUid: null,
    phase: 'lobby',
    difficulty,
    activeSpellIds,
    currentPlayer: 'host',
    host: { name: hostName.trim() || 'PLAYER 1', hp: cfg.startingHp, hiddenCount: cfg.tilesPerPlayer },
    guest: { name: 'PLAYER 2', hp: cfg.startingHp, hiddenCount: cfg.tilesPerPlayer },
    pendingDeclare: null,
    declareLog: [],
    winner: null,
    log: [nowLog('방이 만들어졌습니다. 친구에게 초대 코드를 알려주세요.')],
  }

  await setDoc(roomRef(code), room)
  await setDoc(privateRef(code, 'guest'), guestHand)
  return code
}

/** 초대 코드로 입장한다. 방금 들어온 게스트가 (이제 guestUid가 실제로
 * 채워졌으니) 호스트의 손패를 대신 배분해 준다 — 호스트는 여전히
 * 자기 손패를 못 읽는다. */
export async function joinAbracaRoom(code: string, guestName: string): Promise<{ role: AbracaRole } | null> {
  const uid = await requireUid()
  const upper = code.trim().toUpperCase()
  const ref = roomRef(upper)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  const room = snap.data() as AbracaRoomDoc

  if (room.hostUid === uid) return { role: 'host' }
  if (room.guestUid === uid) return { role: 'guest' }
  if (room.guestUid) return null
  if (room.phase !== 'lobby') return null

  await updateDoc(ref, {
    guestUid: uid,
    phase: 'playing',
    guest: { ...room.guest, name: guestName.trim() || 'PLAYER 2' },
    log: [...room.log, nowLog('상대가 입장했습니다. 게임을 시작합니다!')],
  })

  const cfg = DIFFICULTY_CONFIG[room.difficulty]
  const hostHand: AbracaHandDoc = { remaining: rollHandCounts(room.activeSpellIds, cfg.tilesPerPlayer) }
  await setDoc(privateRef(upper, 'host'), hostHand)

  return { role: 'guest' }
}

export function watchAbracaRoom(code: string, onChange: (room: AbracaRoomDoc | null) => void): Unsubscribe {
  return onSnapshot(roomRef(code), (snap) => onChange(snap.exists() ? (snap.data() as AbracaRoomDoc) : null))
}

/** 상대의 손패를 구독한다 — 이 게임에서 내가 읽을 수 있는 유일한
 * 손패다("내 마법"은 나도 못 본다). */
export function watchOpponentHand(code: string, myRole: AbracaRole, onChange: (hand: AbracaHandDoc | null) => void): Unsubscribe {
  return onSnapshot(privateRef(code, otherRole(myRole)), (snap) => onChange(snap.exists() ? (snap.data() as AbracaHandDoc) : null))
}

/** 내 차례에 마법을 하나 선언한다. 내 손패는 나도 못 읽으니 여기서는
 * "무엇을 선언했는지"만 공개 문서에 남기고 턴은 그대로 둔다 — 실제
 * 판정은 상대 클라이언트가 resolvePendingDeclare로 한다. */
export async function declareAbracaSpell(code: string, room: AbracaRoomDoc, role: AbracaRole, spellId: SpellId): Promise<void> {
  if (room.phase !== 'playing') throw new Error('아직 게임이 시작되지 않았어요.')
  if (room.currentPlayer !== role) throw new Error('지금은 당신의 차례가 아니에요.')
  if (room.pendingDeclare) throw new Error('이전 판정이 아직 끝나지 않았어요.')

  await updateDoc(roomRef(code), { pendingDeclare: { by: role, spellId } })
}

/** 선언자가 아닌 사람만 호출 가능. 선언자의 손패(내가 유일하게 읽을
 * 수 있는 손패)를 읽어 실제로 성공/실패를 판정하고, 손패·체력·로그를
 * 갱신한다. 어느 한쪽 체력이 0 이하가 되면 즉시 게임을 끝낸다. */
export async function resolvePendingDeclare(code: string, room: AbracaRoomDoc, myRole: AbracaRole): Promise<void> {
  const pending = room.pendingDeclare
  if (!pending) throw new Error('판정할 선언이 없어요.')
  if (pending.by === myRole) throw new Error('스스로의 선언은 판정할 수 없어요.')

  const declarerRole = pending.by
  const resolverRole = myRole
  const handRef = privateRef(code, declarerRole)
  const handSnap = await getDoc(handRef)
  if (!handSnap.exists()) throw new Error('상대의 손패를 확인할 수 없어요.')
  const hand = handSnap.data() as AbracaHandDoc

  const outcome = resolveDeclare(hand.remaining, pending.spellId)
  const spellName = SPELL_MAP[pending.spellId].name
  const declarer = room[declarerRole]
  const resolver = room[resolverRole]

  const updates: Record<string, unknown> = {}
  let logLine: string
  let nextDeclarerHp = declarer.hp
  let nextResolverHp = resolver.hp

  if (outcome.success) {
    await setDoc(handRef, { remaining: outcome.nextRemaining } satisfies AbracaHandDoc)
    updates[`${declarerRole}.hiddenCount`] = Math.max(0, declarer.hiddenCount - 1)
    nextResolverHp = resolver.hp - 1
    updates[`${resolverRole}.hp`] = nextResolverHp
    logLine = `${declarer.name}이(가) "${spellName}"을(를) 선언했습니다 → 성공! ${resolver.name}의 체력이 1 감소했습니다.`
  } else {
    nextDeclarerHp = declarer.hp - 1
    updates[`${declarerRole}.hp`] = nextDeclarerHp
    logLine = `${declarer.name}이(가) "${spellName}"을(를) 선언했습니다 → 실패! ${declarer.name}의 체력이 1 감소했습니다.`
  }

  const declareEntry: AbracaDeclareLogEntry = { by: declarerRole, spellId: pending.spellId, success: outcome.success, at: Date.now() }
  const declareLog = [...room.declareLog, declareEntry]
  const log = [...room.log, nowLog(logLine)]

  const loserRole: AbracaRole | null = nextResolverHp <= 0 ? resolverRole : nextDeclarerHp <= 0 ? declarerRole : null

  if (loserRole) {
    const winnerRole = otherRole(loserRole)
    log.push(nowLog(`${room[loserRole].name}의 체력이 모두 사라졌습니다. ${room[winnerRole].name} 승리!`))
    await updateDoc(roomRef(code), { ...updates, pendingDeclare: null, declareLog, log, phase: 'over', winner: winnerRole })
    return
  }

  await updateDoc(roomRef(code), { ...updates, pendingDeclare: null, declareLog, log, currentPlayer: resolverRole })
}
