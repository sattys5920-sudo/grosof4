// Firestore/네트워크와 무관한 순수 로직. STEP이 늘어날 때마다 이 파일에
// 셔플·판정 함수를 추가해서 vitest로 검증한다.
import type {
  Crisis,
  CrossroadCard,
  CrossroadEffect,
  ExposureFace,
  ItemCategory,
  ItemType,
  LocationId,
  PlayerSlot,
  SearchableLocationId,
  SecretObjective,
  Survivor,
  SurvivorInstance,
} from './types'

/** 콜로니 자원 시작값. 원작은 인원수·시나리오마다 다르지만, 여기서는
 * 4인 고정에 맞춘 값 하나로 단순화했다. */
export const STARTING_FOOD = 8
export const STARTING_MORALE = 10

/** 주사위 하나를 굴린다(1~6). */
function rollDie(rng: () => number): number {
  return Math.floor(rng() * 6) + 1
}

/** 피셔-예이츠 셔플. rng를 주입할 수 있어 테스트에서 결정적으로 검증한다. */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 헷갈리는 0/O, 1/I 제외

/** 초대 코드를 만든다. 4자리 — 대문자/숫자만 써서 손으로 불러줘도 헷갈리지
 * 않게 한다. */
export function generateRoomCode(rng: () => number = Math.random, length = 4): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_CHARS[Math.floor(rng() * ROOM_CODE_CHARS.length)]
  }
  return code
}

/** 방에 모두(4명) 모였고 전원이 준비 완료 상태인지 확인한다 — 방장의
 * "게임 시작" 버튼을 활성화할지 판단하는 데 쓴다. */
export function allReady(players: PlayerSlot[], maxPlayers: number): boolean {
  return players.length === maxPlayers && players.every((p) => p.ready)
}

export interface AdvanceTurnResult {
  nextPlayerIndex: number
  roundOver: boolean
}

/** 현재 플레이어의 턴을 끝낸다. turnOrder의 마지막 사람이었다면 라운드가
 * 끝난 것 — 콜로니 단계로 넘어가야 한다는 신호만 돌려주고, 실제 콜로니
 * 단계 처리는 STEP 8~9에서 구현한다. */
export function advanceTurn(turnOrder: string[], currentPlayerIndex: number): AdvanceTurnResult {
  const next = currentPlayerIndex + 1
  if (next >= turnOrder.length) return { nextPlayerIndex: currentPlayerIndex, roundOver: true }
  return { nextPlayerIndex: next, roundOver: false }
}

/** 다음 라운드의 선 플레이어 자리를 한 칸 돌린다(섹션 13 ⑦ 선 플레이어
 * 변경). */
export function nextFirstPlayerIndex(turnOrder: string[], firstPlayerIndex: number): number {
  return (firstPlayerIndex + 1) % turnOrder.length
}

/** 각 플레이어에게 생존자 2명씩 배분한다(섹션 3). 풀에서 겹치지 않게
 * 뽑고, 각자 처음 뽑힌 생존자가 리더가 된다. 전원 콜로니에서 시작한다.
 * 풀이 필요한 수보다 적으면 던진다 — 배포 시 항상 넉넉한 풀을 준다. */
export function dealSurvivors(players: PlayerSlot[], pool: Survivor[], rng: () => number = Math.random): SurvivorInstance[] {
  const need = players.length * 2
  if (pool.length < need) throw new Error(`생존자 풀이 부족합니다 (${pool.length}/${need})`)
  const shuffled = shuffle(pool, rng)
  const instances: SurvivorInstance[] = []
  players.forEach((p, i) => {
    const [first, second] = shuffled.slice(i * 2, i * 2 + 2)
    instances.push(
      { survivorId: first.id, ownerUid: p.uid, locationId: 'colony', wounds: 0, frostbite: false, alive: true, isLeader: true },
      { survivorId: second.id, ownerUid: p.uid, locationId: 'colony', wounds: 0, frostbite: false, alive: true, isLeader: false },
    )
  })
  return instances
}

/** 각 플레이어가 이번 라운드에 받을 행동 주사위를 굴린다. 개수는 "생존자
 * 수 + 1"(섹션 3) — 죽은 생존자는 세지 않는다. */
export function rollAllPlayerDice(
  players: PlayerSlot[],
  survivors: SurvivorInstance[],
  rng: () => number = Math.random,
): Record<string, number[]> {
  const dice: Record<string, number[]> = {}
  for (const p of players) {
    const aliveCount = survivors.filter((s) => s.ownerUid === p.uid && s.alive).length
    const count = aliveCount + 1
    dice[p.uid] = Array.from({ length: count }, () => rollDie(rng))
  }
  return dice
}

/** 주사위 결과와 짝이 맞는 "전부 안 쓴" 초기 사용 여부 배열을 만든다. */
export function initialDiceUsed(dice: Record<string, number[]>): Record<string, boolean[]> {
  const used: Record<string, boolean[]> = {}
  for (const uid of Object.keys(dice)) {
    used[uid] = dice[uid].map(() => false)
  }
  return used
}

/** 아직 안 쓴 주사위 하나를 찾아 쓴 것으로 표시한다. 이동·탐색은 눈
 * 상관없이 아무 주사위나 하나 쓰면 된다(공격만 요구값이 있다 — 섹션 23,
 * STEP 6에서는 공격 자체를 아직 안 만든다). 남은 주사위가 없으면 null. */
export function consumeAnyDie(diceUsed: boolean[]): { usedIndex: number; nextDiceUsed: boolean[] } | null {
  const idx = diceUsed.findIndex((u) => !u)
  if (idx === -1) return null
  const next = [...diceUsed]
  next[idx] = true
  return { usedIndex: idx, nextDiceUsed: next }
}

/** 생존자 한 명을 다른 장소로 옮긴 새 배열을 돌려준다(섹션 6 이동).
 * 대상 생존자가 없거나·다른 사람 소유거나·죽었으면 던진다. */
export function applySurvivorMove(
  survivors: SurvivorInstance[],
  survivorId: string,
  ownerUid: string,
  destination: LocationId,
): SurvivorInstance[] {
  const idx = survivors.findIndex((s) => s.survivorId === survivorId)
  if (idx === -1) throw new Error('생존자를 찾을 수 없어요.')
  const s = survivors[idx]
  if (s.ownerUid !== ownerUid) throw new Error('내 생존자가 아니에요.')
  if (!s.alive) throw new Error('이미 죽은 생존자예요.')
  if (s.locationId === destination) throw new Error('이미 그 장소에 있어요.')
  const next = survivors.slice()
  next[idx] = { ...s, locationId: destination }
  return next
}

/** 이 장소의 탐색 카드 더미를 섞어서 아이템 종류 id 배열로 만든다. */
export function buildItemDeck(items: ItemType[], rng: () => number = Math.random): string[] {
  return shuffle(items, rng).map((t) => t.id)
}

/** 6개 탐색 장소 전부의 카드 더미를 만든다. */
export function buildAllItemDecks(
  locations: SearchableLocationId[],
  itemsForLocation: (loc: SearchableLocationId) => ItemType[],
  rng: () => number = Math.random,
): Partial<Record<LocationId, string[]>> {
  const decks: Partial<Record<LocationId, string[]>> = {}
  for (const loc of locations) {
    decks[loc] = buildItemDeck(itemsForLocation(loc), rng)
  }
  return decks
}

export interface DrawResult {
  drawn: string | null
  remaining: string[]
}

/** 더미 맨 앞 카드를 뽑는다. 더미가 비어 있으면 drawn이 null이다(그래도
 * 탐색 자체는 시도한 거라 주사위는 소모된다). */
export function drawFromDeck(deck: string[]): DrawResult {
  if (deck.length === 0) return { drawn: null, remaining: [] }
  const [drawn, ...remaining] = deck
  return { drawn, remaining }
}

/** 상처를 몇 번 입어야 죽는지 — 원작은 생존자 카드마다 다르지만, 이
 * 구현에서는 전부 2로 단순화했다. */
export const WOUND_LIMIT = 2

// 6면 중 빈 면 2, 상처 2, 동상 1, 물림 1 — 원작 노출 다이의 대략적인
// 비율을 따랐다(섹션 8).
const EXPOSURE_FACES: ExposureFace[] = ['blank', 'blank', 'wound', 'wound', 'frostbite', 'bite']

/** 노출 주사위를 굴린다(섹션 8) — 이동했거나 좀비를 처치했을 때. */
export function rollExposure(rng: () => number = Math.random): ExposureFace {
  return EXPOSURE_FACES[Math.floor(rng() * EXPOSURE_FACES.length)]
}

/** 이 주인에게 살아있는 리더가 없으면, 살아있는 생존자 중 첫 번째를 새
 * 리더로 세운다(섹션 10). 죽지 않은 상태 변경에는 영향 없다. */
function ensureLeader(survivors: SurvivorInstance[], ownerUid: string): SurvivorInstance[] {
  const mine = survivors.filter((s) => s.ownerUid === ownerUid)
  if (mine.some((s) => s.isLeader && s.alive)) return survivors
  const promoted = mine.find((s) => s.alive)
  if (!promoted) return survivors
  return survivors.map((s) => (s.ownerUid === ownerUid ? { ...s, isLeader: s.survivorId === promoted.survivorId } : s))
}

/** 노출 결과 한 개를 생존자 한 명에게 적용한다(섹션 8). 물림은 그 자리에서
 * 사망, 상처는 누적되다 한계에 도달하면 사망 — 어느 쪽이든 죽으면 리더를
 * 다시 세운다. */
export function applyExposureFace(survivors: SurvivorInstance[], survivorId: string, face: ExposureFace): SurvivorInstance[] {
  const idx = survivors.findIndex((s) => s.survivorId === survivorId)
  if (idx === -1) return survivors
  const s = survivors[idx]

  if (face === 'blank') return survivors
  if (face === 'frostbite') {
    const next = survivors.slice()
    next[idx] = { ...s, frostbite: true }
    return next
  }
  if (face === 'wound') {
    const wounds = s.wounds + 1
    const next = survivors.slice()
    next[idx] = wounds >= WOUND_LIMIT ? { ...s, wounds, alive: false } : { ...s, wounds }
    return wounds >= WOUND_LIMIT ? ensureLeader(next, s.ownerUid) : next
  }
  // bite
  const next = survivors.slice()
  next[idx] = { ...s, alive: false }
  return ensureLeader(next, s.ownerUid)
}

/** 물림으로 죽은 생존자와 같은 장소에서, 살아있는 생존자 중 영향력이
 * 가장 낮은 사람을 찾는다(섹션 9). 동률이면 배열 순서상 먼저 나온 쪽.
 * 영향력은 SurvivorInstance가 아니라 원형 데이터(Survivor)에 있어서
 * survivorMap으로 조회한다. */
export function findBiteContagionTarget(
  survivors: SurvivorInstance[],
  locationId: LocationId,
  excludeSurvivorId: string,
  survivorMap: Record<string, Survivor>,
): SurvivorInstance | null {
  const candidates = survivors.filter((s) => s.locationId === locationId && s.alive && s.survivorId !== excludeSurvivorId)
  if (candidates.length === 0) return null
  const influenceOf = (s: SurvivorInstance) => survivorMap[s.survivorId]?.influence ?? Infinity
  return candidates.reduce((lowest, s) => (influenceOf(s) < influenceOf(lowest) ? s : lowest))
}

export interface ExposureResolution {
  survivors: SurvivorInstance[]
  face: ExposureFace
  died: boolean
  pendingBite: { locationId: LocationId; targetSurvivorId: string; targetOwnerUid: string } | null
}

/** 이동했거나 좀비를 처치한 생존자에게 노출 주사위를 굴려서 적용하고,
 * 물림으로 죽었다면 같은 장소의 다음 전염 대상을 찾는다(있으면 그 사람의
 * 선택을 기다려야 하므로 pendingBite로 돌려준다). */
export function resolveExposure(
  survivors: SurvivorInstance[],
  survivorId: string,
  survivorMap: Record<string, Survivor>,
  rng: () => number = Math.random,
): ExposureResolution {
  const before = survivors.find((s) => s.survivorId === survivorId)
  const face = rollExposure(rng)
  const next = applyExposureFace(survivors, survivorId, face)
  const after = next.find((s) => s.survivorId === survivorId)
  const died = Boolean(before?.alive && after && !after.alive)

  let pendingBite: ExposureResolution['pendingBite'] = null
  if (face === 'bite' && before) {
    const target = findBiteContagionTarget(next, before.locationId, survivorId, survivorMap)
    if (target) pendingBite = { locationId: before.locationId, targetSurvivorId: target.survivorId, targetOwnerUid: target.ownerUid }
  }

  return { survivors: next, face, died, pendingBite }
}

/** 물림 전염 대상이 "다시 굴리기"를 골랐을 때(섹션 9 선택 B). 빈 면이면
 * 살아남고, 그 외 전부는 (실제 상처/동상 여부와 무관하게) 전염이 확정돼
 * 죽는다 — 룰 원문 그대로 구현했다. 죽으면 다음 대상을 또 찾는다. */
export function resolveBiteReroll(
  survivors: SurvivorInstance[],
  survivorId: string,
  survivorMap: Record<string, Survivor>,
  rng: () => number = Math.random,
): ExposureResolution {
  const before = survivors.find((s) => s.survivorId === survivorId)
  const face = rollExposure(rng)

  if (face === 'blank' || !before) {
    return { survivors, face, died: false, pendingBite: null }
  }

  const next = applyExposureFace(survivors, survivorId, 'bite')
  const target = findBiteContagionTarget(next, before.locationId, survivorId, survivorMap)
  return {
    survivors: next,
    face,
    died: true,
    pendingBite: target ? { locationId: before.locationId, targetSurvivorId: target.survivorId, targetOwnerUid: target.ownerUid } : null,
  }
}

/** 전염 대상이 "즉시 사망"을 골랐을 때(섹션 9 선택 A). */
export function applyBiteDeath(survivors: SurvivorInstance[], survivorId: string, survivorMap: Record<string, Survivor>): ExposureResolution {
  const before = survivors.find((s) => s.survivorId === survivorId)
  const next = applyExposureFace(survivors, survivorId, 'bite')
  const target = before ? findBiteContagionTarget(next, before.locationId, survivorId, survivorMap) : null
  return {
    survivors: next,
    face: 'bite',
    died: true,
    pendingBite: target ? { locationId: before!.locationId, targetSurvivorId: target.survivorId, targetOwnerUid: target.ownerUid } : null,
  }
}

export interface FoodPaymentResult {
  nextFood: number
  starvation: number
}

/** 콜로니 단계 ① 식량 지불(섹션 13). 콜로니에 있는 생존자 2명당 식량 1개를
 * 낸다(나머지는 반올림해서 더 필요한 쪽으로). 모자라면 부족한 만큼 기아
 * 토큰이 생기고, 그 개수만큼 나중에 사기가 깎인다. */
export function resolveFoodPayment(food: number, survivorsAtColony: number): FoodPaymentResult {
  const needed = Math.ceil(survivorsAtColony / 2)
  if (food >= needed) return { nextFood: food - needed, starvation: 0 }
  return { nextFood: 0, starvation: needed - food }
}

/** 콜로니 단계 ④ 좀비 추가(섹션 11)를 단순화한 버전 — 매 라운드 6개
 * 외부 장소 전부에 좀비를 1마리씩 늘린다. 원작처럼 장소별 생존자 수·
 * 소음 토큰에 따라 달라지는 정교한 공식은 아니다(소음 토큰 자체를 이
 * 구현에 안 만들었다). */
export function addRoundZombies(
  zombies: Partial<Record<LocationId, number>>,
  locations: SearchableLocationId[],
): Partial<Record<LocationId, number>> {
  const next = { ...zombies }
  for (const loc of locations) next[loc] = (next[loc] ?? 0) + 1
  return next
}

/** 이번 라운드의 위기 카드를 뽑는다(섹션 1, 4 STEP1). */
export function pickCrisis(crises: Crisis[], rng: () => number = Math.random): Crisis {
  return crises[Math.floor(rng() * crises.length)]
}

export interface CrisisResolution {
  success: boolean
  score: number
  threshold: number
}

/** 콜로니 단계 ③ 위기 해결(섹션 13). 이번 라운드에 기여된 아이템을 전부
 * 모아 채점한다 — 위기가 요구하는 대분류면 +1, 아니면 -1. 점수가
 * "콜로니에 남아있는(=살아있는 생존자가 있는) 플레이어 수" 이상이면
 * 성공이다. */
export function resolveCrisis(
  contributedItemIds: string[],
  requiredCategory: ItemCategory,
  itemTypeMap: Record<string, ItemType>,
  activePlayerCount: number,
): CrisisResolution {
  let score = 0
  for (const itemId of contributedItemIds) {
    const item = itemTypeMap[itemId]
    if (!item) continue
    score += item.category === requiredCategory ? 1 : -1
  }
  return { success: score >= activePlayerCount, score, threshold: activePlayerCount }
}

/** 이번 라운드의 크로스로드 카드를 뽑는다(섹션 15). */
export function pickCrossroad(cards: CrossroadCard[], rng: () => number = Math.random): CrossroadCard {
  return cards[Math.floor(rng() * cards.length)]
}

/** 지금 카드가 발동 조건(도착한/탐색한 장소)에 맞는지 판정한다. 이미
 * 이번 라운드에 한 번 발동했으면(카드는 라운드에 한 번만 쓴다) 다시
 * 발동하지 않는다. */
export function checkCrossroadTrigger(
  card: CrossroadCard | undefined,
  alreadyTriggered: boolean,
  locationId: LocationId,
): boolean {
  if (!card || alreadyTriggered) return false
  return card.triggerLocationId === locationId
}

export interface CrossroadResourceState {
  food: number
  morale: number
  zombies: Partial<Record<LocationId, number>>
}

/** 예/아니오 선택 결과를 콜로니 자원에 반영한다. 식량/사기는 음수로
 * 안 내려가게 클램프한다. */
export function applyCrossroadEffect(state: CrossroadResourceState, effect: CrossroadEffect): CrossroadResourceState {
  const food = Math.max(0, state.food + (effect.foodDelta ?? 0))
  const morale = Math.max(0, state.morale + (effect.moraleDelta ?? 0))
  const zombies = { ...state.zombies }
  if (effect.zombieDelta) {
    const { locationId, amount } = effect.zombieDelta
    zombies[locationId] = Math.max(0, (zombies[locationId] ?? 0) + amount)
  }
  return { food, morale, zombies }
}

/** 비밀 목표 카드를 섞어서 플레이어마다 서로 다른 카드 하나씩 배분한다
 * (섹션 16). 카드 풀이 인원수보다 적으면 던진다 — 8종을 4인 고정에
 * 맞춰 뒀으니 실제로는 안 일어난다. */
export function dealSecretObjectives(
  players: PlayerSlot[],
  pool: SecretObjective[],
  rng: () => number = Math.random,
): Record<string, string> {
  if (pool.length < players.length) throw new Error('비밀 목표 카드가 인원수보다 적어요.')
  const shuffled = shuffle(pool, rng)
  const result: Record<string, string> = {}
  players.forEach((p, i) => {
    result[p.uid] = shuffled[i].id
  })
  return result
}
