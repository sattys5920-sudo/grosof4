import { GAME_RULES } from './rules'
import type { EndingId, GameState } from './types'

export interface EndingResult {
  id: EndingId
  title: string
  description: string
}

// 30일이라는 고정 결승선이 사라진 뒤의 엔딩들. 이제 게임은
// (1) 진실을 전부 알아내는 순간, (2) 플레이어가 스스로 탈출을 택하는 순간,
// (3) 죽는 순간 — 이 세 가지 중 하나로만 끝난다. "며칠까지 버텼는지"는
// 엔딩 종류가 아니라 엔딩과 함께 보여 주는 기록이다.
const ENDING_TEXT: Record<EndingId, { title: string; description: string }> = {
  true: {
    title: '진실',
    description:
      '재난은 단순한 자연재해가 아니었다. 대피소는 거대한 생존 실험의 일부였고, 구조 신호와 외부 정보 상당수는 의도적으로 조작된 것이었다. 흩어져 있던 조각을 전부 맞춘 순간, 더는 대피소에 남아 있을 이유가 없어졌다.',
  },
  escape: {
    title: '탈출',
    description: '준비해 둔 차량과 경로로 대피소를 벗어났다. 바깥은 여전히 낯설지만, 처음으로 스스로 정한 방향으로 나아간다.',
  },
  sacrifice: {
    title: '희생',
    description: '누군가 자신을 대신해 이곳에 남았다. 그 선택 덕분에 대피소를 벗어날 수 있었다.',
  },
  infection: {
    title: '감염',
    description: '오염은 결국 몸 안까지 스며들었다. 더는 버티지 못한 채, 대피소는 조용해졌다.',
  },
  breakdown: {
    title: '정신 붕괴',
    description: '몸은 버텼지만 마음이 먼저 무너졌다. 마지막 며칠의 기억은 온전하지 않다.',
  },
  dehydration: {
    title: '탈수',
    description: '물이 끊긴 지 사흘째, 더는 버틸 수 없었다.',
  },
  starvation: {
    title: '굶주림',
    description: '나흘 동안 아무것도 먹지 못한 몸이 먼저 한계를 알렸다.',
  },
  shelterCollapse: {
    title: '붕괴',
    description: '대피소가 무너진 뒤, 새로운 은신처를 찾지 못했다.',
  },
  death: {
    title: '끝',
    description: '더는 버티지 못했다.',
  },
}

/** 진엔딩(진실) 조건을 전부 만족했는지 — 만족하는 즉시 게임이 끝난다. */
export function isTrueEndingReady(state: GameState): boolean {
  const f = state.flags
  const radioOk = (state.counters.radioStory ?? 0) >= GAME_RULES.ENDING_TRUE_RADIO_COUNT
  return (
    state.stats.info >= GAME_RULES.ENDING_TRUE_INFO &&
    radioOk &&
    f.militaryRecord === true &&
    f.labExplored === true &&
    f.blackBox === true &&
    f.finalBroadcast === true &&
    f.truthDoor === true
  )
}

export function trueEndingResult(): EndingResult {
  return { id: 'true', ...ENDING_TEXT.true }
}

/** 탈출 조건(차량/경로 확보)이 갖춰진 뒤 플레이어가 직접 "탈출한다"를 골랐을 때. */
export function escapeEndingResult(state: GameState): EndingResult {
  const id: EndingId = state.flags.survivorSacrificed ? 'sacrifice' : 'escape'
  return { id, ...ENDING_TEXT[id] }
}

/** 사망으로 게임이 끝났을 때 사망 원인에 대응하는 엔딩. */
export function endingForDeathCause(cause: string): EndingResult {
  const id: EndingId =
    cause === 'dehydration'
      ? 'dehydration'
      : cause === 'starvation'
        ? 'starvation'
        : cause === 'infection'
          ? 'infection'
          : cause === 'breakdown'
            ? 'breakdown'
            : cause === 'shelterCollapse'
              ? 'shelterCollapse'
              : 'death'
  return { id, ...ENDING_TEXT[id] }
}

export function endingText(id: EndingId): { title: string; description: string } {
  return ENDING_TEXT[id]
}
