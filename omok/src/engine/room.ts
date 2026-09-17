// Firestore와 엮인 방 생성/입장/착수 함수. 오목판은 숨길 정보가 없는
// 완전공개 게임이라 셜록13/아브라카왓과 달리 private 서브컬렉션이 아예
// 없다 — 방 문서 하나(공개 moves 배열)만으로 충분하다.
import { doc, getDoc, setDoc, updateDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db, ensureSignedIn, SignInFailedError } from '../firebase'
import { generateRoomCode } from './logic'
import { applyMoves, canPlace, findWinLine, isForbiddenDoubleThree, roleColor } from './board'
import type { LogEntry, Move, Role, RoomDoc } from './types'
import { TURN_SECONDS } from './types'

const ROOMS = 'omokRooms'

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

function nowLog(text: string): LogEntry {
  return { at: Date.now(), text }
}

function otherRole(role: Role): Role {
  return role === 'host' ? 'guest' : 'host'
}

/** 새 방을 만든다. 방을 만든 사람이 항상 흑(선공)이다. */
export async function createRoom(hostName: string): Promise<string> {
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
    phase: 'lobby',
    hostUid: uid,
    guestUid: null,
    hostName: hostName.trim() || '호스트',
    guestName: '',
    currentTurn: 'host',
    moves: [],
    result: null,
    log: [nowLog('방이 만들어졌습니다. 친구에게 초대 코드를 알려주세요. (방장이 흑, 선공입니다)')],
    turnDeadline: null,
  }

  await setDoc(roomRef(code), room)
  return code
}

export async function joinRoom(code: string, guestName: string): Promise<{ role: Role } | null> {
  const uid = await requireUid()
  const upper = code.trim().toUpperCase()
  const snap = await getDoc(roomRef(upper))
  if (!snap.exists()) return null
  const room = snap.data() as RoomDoc

  if (room.hostUid === uid) return { role: 'host' }
  if (room.guestUid === uid) return { role: 'guest' }
  if (room.guestUid) return null // 이미 다른 사람이 들어와 있음

  await updateDoc(roomRef(upper), {
    guestUid: uid,
    guestName: guestName.trim() || '게스트',
    phase: 'playing',
    turnDeadline: Date.now() + TURN_SECONDS * 1000,
    log: [...room.log, nowLog('상대가 입장했습니다. 게임을 시작합니다! (백) 한 수당 60초입니다.')],
  })
  return { role: 'guest' }
}

export function watchRoom(code: string, onChange: (room: RoomDoc | null) => void): Unsubscribe {
  return onSnapshot(roomRef(code), (snap) => onChange(snap.exists() ? (snap.data() as RoomDoc) : null))
}

/** 착수. 차례가 아니거나, 이미 돌이 있거나, 흑의 쌍삼 자리면 거부한다.
 * 규칙 위반은 서버 규칙이 아니라 여기(정상 클라이언트가 지켜야 할 약속)
 * 에서 막는다 — 오목판엔 애초에 숨길 정보가 없어서 클라이언트를 믿고
 * 진행해도 다른 게임들만큼의 보안 리스크가 없다. */
export async function placeStone(code: string, room: RoomDoc, role: Role, row: number, col: number): Promise<void> {
  if (room.phase !== 'playing') throw new Error('아직 게임이 시작되지 않았어요.')
  if (room.currentTurn !== role) throw new Error('지금은 당신의 차례가 아니에요.')

  const board = applyMoves(room.moves)
  if (!canPlace(board, row, col)) throw new Error('이미 돌이 있는 자리예요.')

  const color = roleColor(role)
  if (isForbiddenDoubleThree(board, row, col, color)) {
    throw new Error('쌍삼 자리라 둘 수 없어요 (한 수로 열린 삼이 두 방향 이상 생겨요).')
  }

  const move: Move = { row, col, color, by: role }
  const nextMoves = [...room.moves, move]
  const nextBoard = board.map((r) => r.slice())
  nextBoard[row][col] = color
  const winLine = findWinLine(nextBoard, row, col, color)

  const roleName = role === 'host' ? room.hostName || '호스트' : room.guestName || '게스트'
  const posLabel = `${String.fromCharCode(65 + col)}${row + 1}`

  if (winLine) {
    await updateDoc(roomRef(code), {
      moves: nextMoves,
      phase: 'over',
      result: { winner: role, line: winLine },
      turnDeadline: null,
      log: [...room.log, nowLog(`${roleName}이(가) ${posLabel}에 두어 오목을 완성했습니다!`)],
    })
    return
  }

  await updateDoc(roomRef(code), {
    moves: nextMoves,
    currentTurn: otherRole(role),
    turnDeadline: Date.now() + TURN_SECONDS * 1000,
    log: [...room.log, nowLog(`${roleName}이(가) ${posLabel}에 두었습니다.`)],
  })
}

/** 시간패 선언. 지금 차례인 사람의 60초 제한이 지났으면 누구(둘 중
 * 아무나의 클라이언트)나 호출해서 상대(제한을 넘긴 사람)의 패배로 끝낼
 * 수 있다. 이미 게임이 끝났거나 아직 시간이 안 지났으면 조용히
 * 아무것도 하지 않는다 — 두 클라이언트가 거의 동시에 시간 초과를
 * 감지해도 안전하다. */
export async function claimTimeout(code: string, room: RoomDoc): Promise<void> {
  if (room.phase !== 'playing') return
  if (!room.turnDeadline || Date.now() < room.turnDeadline) return

  const lateRole = room.currentTurn
  const winner = otherRole(lateRole)
  const lateName = lateRole === 'host' ? room.hostName || '호스트' : room.guestName || '게스트'

  await updateDoc(roomRef(code), {
    phase: 'over',
    result: { winner, line: [] },
    turnDeadline: null,
    log: [...room.log, nowLog(`${lateName}이(가) 60초 안에 두지 못해 시간패했습니다.`)],
  })
}
