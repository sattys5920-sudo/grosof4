// Firestore/네트워크와 무관한 순수 로직. STEP이 늘어날 때마다 이 파일에
// 셔플·판정 함수를 추가해서 vitest로 검증한다.
import type { PlayerSlot } from './types'

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
