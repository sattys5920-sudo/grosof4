import { GAME_RULES } from './rules'
import type { EndingId, GameState } from './types'

export interface EndingResult {
  id: EndingId
  title: string
  description: string
}

const ENDING_TEXT: Record<EndingId, { title: string; description: string }> = {
  true: {
    title: '진실',
    description:
      '재난은 단순한 자연재해가 아니었다. 대피소는 거대한 생존 실험의 일부였고, 구조 신호와 외부 정보 상당수는 의도적으로 조작된 것이었다. 문을 열지 않고 버텨낸 30일이 곧 실험의 마지막 단계였다.',
  },
  escape: {
    title: '탈출',
    description: '준비해 둔 차량과 경로로 대피소를 벗어났다. 바깥은 여전히 낯설지만, 처음으로 스스로 정한 방향으로 나아간다.',
  },
  community: {
    title: '공동체',
    description: '끝까지 함께한 사람들과 30일을 버텼다. 서로를 믿었기에 여기까지 올 수 있었다.',
  },
  sacrifice: {
    title: '희생',
    description: '누군가 자신을 대신해 남았다. 그 선택 덕분에 오늘을 맞았다.',
  },
  infection: {
    title: '감염',
    description: '오염은 결국 몸 안까지 스며들었다. 30일을 채우지 못한 채, 대피소는 조용해졌다.',
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
    description: '30일을 채우지 못했다.',
  },
  solitude: {
    title: '고독',
    description: '아무도 곁에 없이, 홀로 30일을 버텨냈다. 문이 열리자 정적만이 맞이한다.',
  },
  perfect: {
    title: '완벽한 생존',
    description: '체력도, 마음도, 비축한 것들도 흔들림 없이 30일을 마쳤다. 더할 나위 없는 결말이다.',
  },
  normal: {
    title: '생존',
    description: '완벽하지도, 특별하지도 않았지만 살아남았다. 그것으로 충분하다.',
  },
}

function isTrueEndingReady(state: GameState): boolean {
  const f = state.flags
  const radioOk = (state.counters.radioStory ?? 0) >= GAME_RULES.ENDING_TRUE_RADIO_COUNT
  return (
    state.stats.info >= GAME_RULES.ENDING_TRUE_INFO &&
    radioOk &&
    f.militaryRecord === true &&
    f.labExplored === true &&
    f.blackBox === true &&
    f.finalBroadcast === true &&
    f.truthDoor === true &&
    f.doorHeldFinal === true
  )
}

function aliveSurvivors(state: GameState) {
  return state.survivors.filter((s) => s.alive)
}

/**
 * 30일 생존에 성공했을 때 어떤 엔딩인지 우선순위대로 판정한다 (기획서 34).
 * 사망으로 게임이 끝난 경우는 finalizeDeath()에서 별도로 처리한다.
 */
export function evaluateSurvivalEnding(state: GameState): EndingResult {
  const alive = aliveSurvivors(state)
  const avgTrust = alive.length > 0 ? alive.reduce((sum, s) => sum + s.trust, 0) / alive.length : 0
  const isPerfect =
    state.stats.hp >= GAME_RULES.ENDING_PERFECT.hp &&
    state.stats.mental >= GAME_RULES.ENDING_PERFECT.mental &&
    state.stats.water >= GAME_RULES.ENDING_PERFECT.water &&
    state.stats.food >= GAME_RULES.ENDING_PERFECT.food &&
    state.stats.shelter >= GAME_RULES.ENDING_PERFECT.shelter

  // 우선순위: 진엔딩 > 탈출 > 공동체 > 희생 > 감염 > 정신붕괴 > 완벽한 생존 > 고독 > 일반생존
  // (기획서 34번. 탈수/굶주림은 사망 즉시 종료되는 원인이라 여기까지 오지 않는다.)
  let id: EndingId

  if (isTrueEndingReady(state)) {
    id = 'true'
  } else if (state.flags.escapeVehicleReady === true || state.flags.escapeRouteReady === true) {
    id = 'escape'
  } else if (alive.length >= 2 && avgTrust >= GAME_RULES.ENDING_COMMUNITY_TRUST) {
    id = 'community'
  } else if (state.flags.survivorSacrificed === true) {
    id = 'sacrifice'
  } else if (state.statusEffects.infected) {
    id = 'infection'
  } else if (state.mentalBreakdownFlag) {
    id = 'breakdown'
  } else if (isPerfect) {
    id = 'perfect'
  } else if (alive.length === 0) {
    id = 'solitude'
  } else {
    id = 'normal'
  }

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
