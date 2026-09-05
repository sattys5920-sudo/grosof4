// Firestore/네트워크와 무관한 순수 로직. STEP이 늘어날 때마다 이 파일에
// 셔플·판정 함수를 추가해서 vitest로 검증한다.
import type { PlayerSlot, Survivor, SurvivorInstance } from './types'

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
