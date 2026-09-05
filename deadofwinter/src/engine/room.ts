// Firestore와 엮인 방 생성/입장/준비/시작/턴 진행 함수. 게임 본편 상태
// (장소, 생존자, 위기 등)는 각 STEP에서 이 문서에 이어 붙인다.
import { doc, getDoc, setDoc, updateDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db, ensureSignedIn, SignInFailedError } from '../firebase'
import {
  generateRoomCode,
  allReady,
  advanceTurn,
  nextFirstPlayerIndex,
  dealSurvivors,
  rollAllPlayerDice,
  initialDiceUsed,
  consumeAnyDie,
  applySurvivorMove,
  buildAllItemDecks,
  drawFromDeck,
  resolveExposure,
  resolveBiteReroll,
  applyBiteDeath,
  resolveFoodPayment,
  addRoundZombies,
  STARTING_FOOD,
  STARTING_MORALE,
  pickCrisis,
  resolveCrisis,
  pickCrossroad,
  checkCrossroadTrigger,
  applyCrossroadEffect,
  dealSecretObjectives,
  type ExposureResolution,
} from './logic'
import { SURVIVORS, SURVIVOR_MAP } from './survivors'
import { itemsForLocation, ITEM_TYPE_MAP } from './items'
import { CRISES, CRISIS_MAP } from './crises'
import { CROSSROADS, CROSSROAD_MAP } from './crossroads'
import { SECRET_OBJECTIVES } from './secretObjectives'
import type { ExposureFace, PlayerSecret } from './types'
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

/** 비밀 목표(섹션 16) 하나를 담는 서브컬렉션 문서. 보안 규칙상 문서 id와
 * 같은 uid를 가진 사람만 읽을 수 있고, 쓰기는 방장(게임 시작을 실행하는
 * 사람)만 할 수 있다. */
function secretRef(code: string, uid: string) {
  if (!db) throw new Error('오프라인 상태예요.')
  return doc(db, ROOMS, code, 'secrets', uid)
}

/** 내 비밀 목표를 구독한다. 아직 배분 전(로비 등)이면 null. */
export function watchMySecret(code: string, uid: string, onChange: (secret: PlayerSecret | null) => void): Unsubscribe {
  return onSnapshot(secretRef(code, uid), (snap) => onChange(snap.exists() ? (snap.data() as PlayerSecret) : null))
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
  // 첫 라운드는 공격·노출을 바로 테스트할 수 있게 외부 장소마다 1마리씩
  // 깔아 둔다. 그 다음부터는 콜로니 단계마다 addRoundZombies가 늘린다.
  const zombies = Object.fromEntries(SEARCHABLE_LOCATIONS.map((loc) => [loc, 1]))
  const secretAssignments = dealSecretObjectives(room.players, SECRET_OBJECTIVES)
  await Promise.all(
    Object.entries(secretAssignments).map(([uid, objectiveId]) => setDoc(secretRef(code, uid), { objectiveId } satisfies PlayerSecret)),
  )
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
    zombies,
    pendingBite: null,
    food: STARTING_FOOD,
    morale: STARTING_MORALE,
    crisis: pickCrisis(CRISES).id,
    crisisContributions: Object.fromEntries(room.players.map((p) => [p.uid, []])),
    crossroad: pickCrossroad(CROSSROADS).id,
    crossroadTriggered: false,
    crossroadPending: null,
    log: [nowLog('생존자들이 콜로니에 모였습니다. 1라운드를 시작합니다.')],
  })
}

function requireMyTurn(room: RoomDoc, uid: string): asserts room is RoomDoc & { turnOrder: string[]; currentPlayerIndex: number } {
  if (!room.turnOrder || room.currentPlayerIndex === undefined) throw new Error('아직 게임이 시작되지 않았어요.')
  if (room.turnOrder[room.currentPlayerIndex] !== uid) throw new Error('지금은 당신의 턴이 아니에요.')
}

/** 물림 전염 판정이 남아있는 동안은 다른 모든 행동을 막는다 — 지목된
 * 사람이 먼저 선택해야 한다(섹션 9). */
function requireNoPendingBite(room: RoomDoc) {
  if (room.pendingBite) throw new Error('물림 전염 판정을 먼저 처리해야 해요.')
}

/** 크로스로드 카드가 발동해서 예/아니오 선택을 기다리는 동안은 다른
 * 행동을 막는다(섹션 15) — 지목된 생존자의 주인이 먼저 골라야 한다. */
function requireNoPendingCrossroad(room: RoomDoc) {
  if (room.crossroadPending) throw new Error('크로스로드 카드를 먼저 처리해야 해요.')
}

/** 이동/탐색으로 도착·체류한 장소가 이번 라운드 크로스로드 카드의 발동
 * 조건과 맞으면, 그 자리에서 카드를 공개하고 선택을 기다리는 상태로
 * 만들 Firestore 갱신 필드를 만들어 돌려준다. 안 맞으면 빈 객체. */
function crossroadTriggerUpdate(room: RoomDoc, uid: string, survivorId: string, locationId: LocationId): { crossroadTriggered?: boolean; crossroadPending?: { cardId: string; uid: string; survivorId: string } } {
  const card = room.crossroad ? CROSSROAD_MAP[room.crossroad] : undefined
  if (!checkCrossroadTrigger(card, room.crossroadTriggered ?? false, locationId)) return {}
  return {
    crossroadTriggered: true,
    crossroadPending: { cardId: card!.id, uid, survivorId },
  }
}

const EXPOSURE_TEXT: Record<ExposureFace, string> = {
  blank: '아무 일도 없었습니다.',
  wound: '상처를 입었습니다.',
  frostbite: '동상 기운이 돌기 시작했습니다.',
  bite: '물렸습니다!',
}

/** 노출 판정 결과를 로그 줄로 바꾼다. 죽었으면 사망 줄도 덧붙인다. */
function describeExposure(name: string, result: ExposureResolution): LogEntry[] {
  const lines = [nowLog(`${name}: ${EXPOSURE_TEXT[result.face]}`)]
  if (result.died) lines.push(nowLog(`${name}이(가) 죽었습니다.`))
  return lines
}

/** 생존자 한 명을 다른 장소로 옮긴다(섹션 6 이동). 주사위를 하나 쓰고,
 * 이동 직후 노출 판정을 굴린다(섹션 8). 물림이 다른 생존자에게 옮을 수
 * 있으면(섹션 9) pendingBite를 세워서 그 사람의 선택을 기다린다. */
export async function moveSurvivor(
  code: string,
  room: RoomDoc,
  uid: string,
  survivorId: string,
  destination: LocationId,
): Promise<void> {
  requireMyTurn(room, uid)
  requireNoPendingBite(room)
  requireNoPendingCrossroad(room)
  const diceUsed = room.diceUsed?.[uid]
  if (!diceUsed) throw new Error('주사위 정보를 찾을 수 없어요.')
  const consumed = consumeAnyDie(diceUsed)
  if (!consumed) throw new Error('남은 주사위가 없어요.')

  const moved = applySurvivorMove(room.survivors ?? [], survivorId, uid, destination)
  const survivorName = SURVIVOR_MAP[survivorId]?.name ?? '생존자'
  const playerName = room.players.find((p) => p.uid === uid)?.name ?? '생존자'
  const exposure = resolveExposure(moved, survivorId, SURVIVOR_MAP)
  const crossroadUpdate = crossroadTriggerUpdate(room, uid, survivorId, destination)
  const crossroadCard = crossroadUpdate.crossroadPending ? CROSSROAD_MAP[crossroadUpdate.crossroadPending.cardId] : null

  await updateDoc(roomRef(code), {
    survivors: exposure.survivors,
    [`diceUsed.${uid}`]: consumed.nextDiceUsed,
    pendingBite: exposure.pendingBite,
    ...crossroadUpdate,
    log: [
      ...(room.log ?? []),
      nowLog(`${playerName}의 ${survivorName}이(가) 이동했습니다.`),
      ...describeExposure(survivorName, exposure),
      ...(crossroadCard ? [nowLog(`크로스로드 카드 공개: "${crossroadCard.title}"`)] : []),
    ],
  })
}

/** 지금 있는 장소를 탐색한다(섹션 6 탐색). 콜로니는 탐색 대상이 아니다.
 * 카드가 남아있지 않아도 주사위는 소모된다. */
export async function searchLocation(code: string, room: RoomDoc, uid: string, survivorId: string): Promise<void> {
  requireMyTurn(room, uid)
  requireNoPendingBite(room)
  requireNoPendingCrossroad(room)
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
  const crossroadUpdate = crossroadTriggerUpdate(room, uid, survivorId, survivor.locationId)
  const crossroadCard = crossroadUpdate.crossroadPending ? CROSSROAD_MAP[crossroadUpdate.crossroadPending.cardId] : null

  await updateDoc(roomRef(code), {
    [`itemDecks.${survivor.locationId}`]: remaining,
    ...(drawn ? { [`itemsByPlayer.${uid}`]: [...(room.itemsByPlayer?.[uid] ?? []), drawn] } : {}),
    [`diceUsed.${uid}`]: consumed.nextDiceUsed,
    ...crossroadUpdate,
    log: [
      ...(room.log ?? []),
      nowLog(drawn ? `${playerName}이(가) 탐색해서 ${itemName}을(를) 찾았습니다.` : `${playerName}이(가) 탐색했지만 아무것도 찾지 못했습니다.`),
      ...(crossroadCard ? [nowLog(`크로스로드 카드 공개: "${crossroadCard.title}"`)] : []),
    ],
  })
}

/** 위기에 아이템 한 장을 기여한다(섹션 7 — 주사위가 필요 없는 행동).
 * 라운드 아무 때나, 내 턴이 아니어도 낼 수 있다. 손을 떠난 아이템의
 * 실제 결과(맞는 종류인지)는 콜로니 단계에서 한꺼번에 공개된다. */
export async function contributeToCrisis(code: string, room: RoomDoc, uid: string, itemTypeId: string): Promise<void> {
  if (room.roundPhase !== 'turns') throw new Error('지금은 위기에 기여할 수 없어요.')
  const myItems = room.itemsByPlayer?.[uid] ?? []
  const idx = myItems.indexOf(itemTypeId)
  if (idx === -1) throw new Error('그 아이템을 갖고 있지 않아요.')

  const nextItems = myItems.slice()
  nextItems.splice(idx, 1)
  const playerName = room.players.find((p) => p.uid === uid)?.name ?? '생존자'
  const contributions = [...(room.crisisContributions?.[uid] ?? []), itemTypeId]

  await updateDoc(roomRef(code), {
    [`itemsByPlayer.${uid}`]: nextItems,
    [`crisisContributions.${uid}`]: contributions,
    log: [...(room.log ?? []), nowLog(`${playerName}이(가) 위기에 아이템을 기여했습니다.`)],
  })
}

/** 지금 있는 장소의 좀비 한 마리를 공격해 없앤다(섹션 6 공격, 좀비 대상).
 * 처치 성공 시에도 노출 판정을 굴린다(섹션 8). */
export async function attackZombie(code: string, room: RoomDoc, uid: string, survivorId: string): Promise<void> {
  requireMyTurn(room, uid)
  requireNoPendingBite(room)
  requireNoPendingCrossroad(room)
  const survivor = room.survivors?.find((s) => s.survivorId === survivorId)
  if (!survivor) throw new Error('생존자를 찾을 수 없어요.')
  if (survivor.ownerUid !== uid) throw new Error('내 생존자가 아니에요.')
  if (!survivor.alive) throw new Error('이미 죽은 생존자예요.')
  const zombieCount = room.zombies?.[survivor.locationId] ?? 0
  if (zombieCount <= 0) throw new Error('여기엔 공격할 좀비가 없어요.')

  const diceUsed = room.diceUsed?.[uid]
  if (!diceUsed) throw new Error('주사위 정보를 찾을 수 없어요.')
  const consumed = consumeAnyDie(diceUsed)
  if (!consumed) throw new Error('남은 주사위가 없어요.')

  const survivorName = SURVIVOR_MAP[survivorId]?.name ?? '생존자'
  const playerName = room.players.find((p) => p.uid === uid)?.name ?? '생존자'
  const exposure = resolveExposure(room.survivors ?? [], survivorId, SURVIVOR_MAP)

  await updateDoc(roomRef(code), {
    [`zombies.${survivor.locationId}`]: zombieCount - 1,
    survivors: exposure.survivors,
    [`diceUsed.${uid}`]: consumed.nextDiceUsed,
    pendingBite: exposure.pendingBite,
    log: [...(room.log ?? []), nowLog(`${playerName}의 ${survivorName}이(가) 좀비를 처치했습니다.`), ...describeExposure(survivorName, exposure)],
  })
}

/** 물림 전염 대상으로 지목된 사람만 호출 가능(섹션 9). 즉시 사망시키거나
 * 노출 주사위를 다시 굴려 도박한다 — 어느 쪽이든 죽으면 전염이 다음
 * 사람으로 이어질 수 있다. */
export async function resolveBiteChoice(code: string, room: RoomDoc, uid: string, choice: 'die' | 'reroll'): Promise<void> {
  const pending = room.pendingBite
  if (!pending) throw new Error('처리할 물림 전염 판정이 없어요.')
  if (pending.targetOwnerUid !== uid) throw new Error('이 선택은 당신 몫이 아니에요.')

  const targetName = SURVIVOR_MAP[pending.targetSurvivorId]?.name ?? '생존자'
  const survivors = room.survivors ?? []
  const result =
    choice === 'die' ? applyBiteDeath(survivors, pending.targetSurvivorId, SURVIVOR_MAP) : resolveBiteReroll(survivors, pending.targetSurvivorId, SURVIVOR_MAP)

  const log = result.died
    ? [nowLog(`${targetName}이(가) 전염으로 죽었습니다.`)]
    : [nowLog(`${targetName}은(는) 전염을 견뎌냈습니다.`)]

  await updateDoc(roomRef(code), {
    survivors: result.survivors,
    pendingBite: result.pendingBite,
    log: [...(room.log ?? []), ...log],
  })
}

/** 크로스로드 카드가 발동했을 때 지목된 생존자의 주인만 호출 가능(섹션
 * 15). 예/아니오 선택에 따른 효과를 콜로니 자원에 바로 반영한다. */
export async function resolveCrossroadChoice(code: string, room: RoomDoc, uid: string, choice: 'yes' | 'no'): Promise<void> {
  const pending = room.crossroadPending
  if (!pending) throw new Error('처리할 크로스로드 카드가 없어요.')
  if (pending.uid !== uid) throw new Error('이 선택은 당신 몫이 아니에요.')

  const card = CROSSROAD_MAP[pending.cardId]
  if (!card) throw new Error('카드 정보를 찾을 수 없어요.')
  const effect = choice === 'yes' ? card.yesEffect : card.noEffect
  const next = applyCrossroadEffect({ food: room.food ?? STARTING_FOOD, morale: room.morale ?? STARTING_MORALE, zombies: room.zombies ?? {} }, effect)
  const playerName = room.players.find((p) => p.uid === uid)?.name ?? '생존자'
  const choiceLabel = choice === 'yes' ? card.yesLabel : card.noLabel

  await updateDoc(roomRef(code), {
    food: next.food,
    morale: next.morale,
    zombies: next.zombies,
    crossroadPending: null,
    log: [...(room.log ?? []), nowLog(`${playerName}의 선택: "${choiceLabel}" — ${card.description}`)],
  })
}

/** 지금 턴인 사람만 호출 가능. 순서상 마지막 사람이었다면 라운드 단계를
 * 'colony'로 넘긴다 — 방장이 resolveColonyPhase를 눌러야 다음 라운드로
 * 넘어간다. */
export async function endTurn(code: string, room: RoomDoc, uid: string): Promise<void> {
  requireMyTurn(room, uid)
  requireNoPendingBite(room)
  requireNoPendingCrossroad(room)
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

/** 방장만 호출 가능. 콜로니 단계(섹션 13)를 한 번에 처리하고 다음
 * 라운드를 연다: ① 식량 지불(부족하면 사기 감소) → ③ 위기 해결(성공/실패
 * 에 따라 사기 증감, 새 위기 카드 공개) → ④ 좀비 추가(단순화: 외부
 * 6곳에 1마리씩) → ⑥ 라운드 +1 → ⑦ 선 플레이어 한 칸 이동 → 새 주사위
 * 굴리기. 폐기물 확인(②)과 메인 목표 확인(⑤)은 각각 이 구현에 없는
 * 폐기물 더미, 게임 종료를 만드는 STEP 13에서 다룬다. */
export async function resolveColonyPhase(code: string, room: RoomDoc, uid: string): Promise<void> {
  if (room.hostUid !== uid) throw new Error('방장만 콜로니 단계를 진행할 수 있어요.')
  if (room.roundPhase !== 'colony') throw new Error('지금은 콜로니 단계가 아니에요.')
  if (!room.turnOrder || room.firstPlayerIndex === undefined) throw new Error('아직 게임이 시작되지 않았어요.')

  const survivors = room.survivors ?? []
  const atColony = survivors.filter((s) => s.alive && s.locationId === 'colony').length
  const { nextFood, starvation } = resolveFoodPayment(room.food ?? STARTING_FOOD, atColony)

  const activePlayerCount = room.players.filter((p) => survivors.some((s) => s.ownerUid === p.uid && s.alive)).length
  const currentCrisis = room.crisis ? CRISIS_MAP[room.crisis] : undefined
  const allContributions = Object.values(room.crisisContributions ?? {}).flat()
  const crisisResult = currentCrisis ? resolveCrisis(allContributions, currentCrisis.requiredCategory, ITEM_TYPE_MAP, activePlayerCount) : null
  const crisisMoraleDelta = crisisResult ? (crisisResult.success ? 1 : -1) : 0

  const nextMorale = (room.morale ?? STARTING_MORALE) - starvation + crisisMoraleDelta
  const nextZombies = addRoundZombies(room.zombies ?? {}, SEARCHABLE_LOCATIONS)
  const nextFirstIndex = nextFirstPlayerIndex(room.turnOrder, room.firstPlayerIndex)
  const dice = rollAllPlayerDice(room.players, survivors)
  const round = room.round ?? 1
  const nextCrisis = pickCrisis(CRISES)
  const nextCrossroad = pickCrossroad(CROSSROADS)

  const log: LogEntry[] = [
    nowLog(
      starvation > 0
        ? `콜로니 단계: 생존자 ${atColony}명 부양에 식량이 ${starvation}개 부족해 사기가 ${starvation} 줄었습니다.`
        : `콜로니 단계: 생존자 ${atColony}명분 식량을 지불했습니다.`,
    ),
  ]
  if (currentCrisis && crisisResult) {
    log.push(
      nowLog(
        crisisResult.success
          ? `위기 "${currentCrisis.title}" 해결! (점수 ${crisisResult.score}/${crisisResult.threshold}) 사기 +1`
          : `위기 "${currentCrisis.title}" 실패... (점수 ${crisisResult.score}/${crisisResult.threshold}) 사기 -1`,
      ),
    )
  }
  log.push(nowLog(`새 위기 카드: "${nextCrisis.title}"`))
  log.push(nowLog('외부 6개 장소에 좀비가 한 마리씩 늘어났습니다.'))
  log.push(nowLog(`${round}라운드가 끝났습니다. ${round + 1}라운드를 시작합니다.`))

  await updateDoc(roomRef(code), {
    food: nextFood,
    morale: nextMorale,
    zombies: nextZombies,
    round: round + 1,
    firstPlayerIndex: nextFirstIndex,
    currentPlayerIndex: nextFirstIndex,
    roundPhase: 'turns',
    dice,
    diceUsed: initialDiceUsed(dice),
    crisis: nextCrisis.id,
    crisisContributions: Object.fromEntries(room.players.map((p) => [p.uid, []])),
    crossroad: nextCrossroad.id,
    crossroadTriggered: false,
    crossroadPending: null,
    log: [...(room.log ?? []), ...log],
  })
}
