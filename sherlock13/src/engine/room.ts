// Firestore와 엮인 방 생성/입장/행동 함수. 보안 규칙이 실제 방어선이고,
// 여기 있는 코드는 정상적인 클라이언트가 그 규칙 안에서 어떻게 움직이는지
// 정의한다 — "상대 손패를 아예 안 읽는다", "범인 카드는 고발을 확정
// 지은 뒤에만 읽는다" 같은 약속을 여기서 지킨다.
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, type Unsubscribe } from 'firebase/firestore'
import { db, ensureSignedIn } from '../firebase'
import { dealGame, generateRoomCode } from './logic'
import { SUSPECTS } from './suspects'
import type { Accusation, CentralSecretDoc, GameResult, HandDoc, LastAnswer, LogEntry, Role, RoomDoc, SecretDoc, SuspectId, TraitId } from './types'

const ROOMS = 'sherlock13Rooms'

function roomRef(code: string) {
  if (!db) throw new Error('오프라인 상태예요.')
  return doc(db, ROOMS, code)
}
function privateRef(code: string, who: 'host' | 'guest' | 'secret' | 'central') {
  if (!db) throw new Error('오프라인 상태예요.')
  return doc(collection(roomRef(code), 'private'), who)
}

function nowLog(text: string): LogEntry {
  return { at: Date.now(), text }
}

/** 새 방을 만든다. 이 클라이언트(호스트)가 카드를 섞고 나눠서, 각자의
 * 몫을 각각 다른 경로에 써 둔다 — 이 순간 이후로는 만든 사람도 상대
 * 손패나 범인 카드를 다시 읽지 않는다(보안 규칙이 막아 준다). */
export async function createRoom(): Promise<string> {
  const uid = await ensureSignedIn()
  if (!uid || !db) throw new Error('오프라인 상태예요.')

  let code = generateRoomCode()
  for (let tries = 0; tries < 5; tries++) {
    const snap = await getDoc(roomRef(code))
    if (!snap.exists()) break
    code = generateRoomCode()
  }

  const deal = dealGame(SUSPECTS)

  const room: RoomDoc = {
    code,
    createdAt: Date.now(),
    phase: 'lobby',
    hostUid: uid,
    guestUid: null,
    currentPlayer: 'host',
    exchangeCount: 0,
    central: { leftId: null, rightId: null },
    accusation: null,
    result: null,
    answers: [],
    log: [nowLog('방이 만들어졌습니다. 친구에게 초대 코드를 알려주세요.')],
  }

  await setDoc(roomRef(code), room)
  await setDoc(privateRef(code, 'host'), { hand: deal.hostHand } satisfies HandDoc)
  await setDoc(privateRef(code, 'guest'), { hand: deal.guestHand } satisfies HandDoc)
  await setDoc(privateRef(code, 'secret'), { criminalId: deal.criminalId } satisfies SecretDoc)
  await setDoc(privateRef(code, 'central'), { leftId: deal.leftId, rightId: deal.rightId } satisfies CentralSecretDoc)

  return code
}

/** 초대 코드로 두 번째 자리에 들어간다. 방이 이미 꽉 찼거나 없으면
 * null. */
export async function joinRoom(code: string): Promise<{ role: Role } | null> {
  const uid = await ensureSignedIn()
  if (!uid) return null
  const upper = code.trim().toUpperCase()
  const snap = await getDoc(roomRef(upper))
  if (!snap.exists()) return null
  const room = snap.data() as RoomDoc

  if (room.hostUid === uid) return { role: 'host' }
  if (room.guestUid === uid) return { role: 'guest' }
  if (room.guestUid) return null // 이미 다른 사람이 들어와 있음

  await updateDoc(roomRef(upper), {
    guestUid: uid,
    phase: 'playing',
    log: [...room.log, nowLog('상대가 입장했습니다. 게임을 시작합니다!')],
  })
  return { role: 'guest' }
}

export function watchRoom(code: string, onChange: (room: RoomDoc | null) => void): Unsubscribe {
  return onSnapshot(roomRef(code), (snap) => onChange(snap.exists() ? (snap.data() as RoomDoc) : null))
}

export async function getMyHand(code: string, role: Role): Promise<SuspectId[]> {
  const snap = await getDoc(privateRef(code, role))
  if (!snap.exists()) return []
  return (snap.data() as HandDoc).hand
}

function otherRole(role: Role): Role {
  return role === 'host' ? 'guest' : 'host'
}

/** 질문하기: 내 손패에서 특정 특징의 개수를 세서(호출부가 계산해 넘김)
 * 공개 로그에 남긴다 — 답은 원래 공개 정보라 별도 보안 규칙이 필요
 * 없다. */
export async function askQuestion(code: string, room: RoomDoc, asker: Role, trait: TraitId, traitLabel: string, answerCount: number): Promise<void> {
  const askerName = asker === 'host' ? '호스트' : '게스트'
  const answer: LastAnswer = { askedBy: asker, trait, count: answerCount, at: Date.now() }
  await updateDoc(roomRef(code), {
    currentPlayer: otherRole(asker),
    answers: [...room.answers, answer].slice(-40),
    log: [...room.log, nowLog(`${askerName}이(가) "${traitLabel}"을(를) 질문했습니다 → ${answerCount}명`)],
  })
}

/** 중앙 카드 교환: 아직 안 뒤집힌 왼쪽/오른쪽 카드 하나를 내 손으로
 * 가져오고, 대신 내 손에서 고른 카드 하나를 그 자리에 앞면으로 놓는다.
 * 카드의 실제 정체(centralSecret)는 호출 시점에 딱 한 번만 읽는다. */
export async function exchangeCentral(
  code: string,
  room: RoomDoc,
  role: Role,
  side: 'left' | 'right',
  giveSuspectId: SuspectId,
): Promise<void> {
  if (!db) throw new Error('오프라인 상태예요.')
  const centralSnap = await getDoc(privateRef(code, 'central'))
  if (!centralSnap.exists()) throw new Error('중앙 카드를 확인할 수 없어요.')
  const centralSecret = centralSnap.data() as CentralSecretDoc
  const takenId = side === 'left' ? centralSecret.leftId : centralSecret.rightId

  const myHandRef = privateRef(code, role)
  const myHandSnap = await getDoc(myHandRef)
  const myHand = (myHandSnap.data() as HandDoc).hand
  const nextHand = myHand.filter((id) => id !== giveSuspectId).concat(takenId)

  await setDoc(myHandRef, { hand: nextHand } satisfies HandDoc)

  const roleName = role === 'host' ? '호스트' : '게스트'
  const sideLabel = side === 'left' ? '왼쪽' : '오른쪽'
  await updateDoc(roomRef(code), {
    [`central.${side}Id`]: giveSuspectId,
    exchangeCount: room.exchangeCount + 1,
    currentPlayer: otherRole(role),
    log: [...room.log, nowLog(`${roleName}이(가) 중앙 ${sideLabel} 카드를 교환했습니다.`)],
  })
}

/** 범인 고발. 고발은 한 번뿐이라 맞히든 틀리든 그 자리에서 게임이
 * 끝난다 — 정답이면 고발한 사람 승리, 오답이면 상대 승리. 확정 즉시
 * 공개 문서에 accusation을 남겨서(되돌릴 수 없음) 비밀 문서 읽기 권한이
 * 열리게 하고, 곧바로 읽어서 결과를 계산해 다시 공개 문서에 적는다. */
export async function accuse(code: string, room: RoomDoc, role: Role, suspectId: SuspectId): Promise<void> {
  if (!db) throw new Error('오프라인 상태예요.')
  const accusation: Accusation = { by: role, suspectId, at: Date.now() }
  const roleName = role === 'host' ? '호스트' : '게스트'
  await updateDoc(roomRef(code), {
    accusation,
    log: [...room.log, nowLog(`${roleName}이(가) 범인을 고발했습니다…`)],
  })

  const secretSnap = await getDoc(privateRef(code, 'secret'))
  const secret = secretSnap.data() as SecretDoc
  const correct = secret.criminalId === suspectId

  const result: GameResult = { winner: correct ? role : otherRole(role), correct, criminalId: secret.criminalId }
  await updateDoc(roomRef(code), {
    phase: 'over',
    result,
    log: [...room.log, nowLog(correct ? `${roleName}의 고발이 적중했습니다!` : `${roleName}의 고발이 빗나갔습니다.`)],
  })
}
