// 감염/전염/확산/연쇄 확산 처리. 팬데믹 기본판 규칙 그대로:
// - 도시 감염 단계: 감염률 트랙의 숫자만큼 카드를 뽑아 각 도시에 큐브 1개.
// - 전염 카드: 감염률 1칸 증가 -> 감염 덱 맨 아래 카드로 큐브 3개 배치 ->
//   감염 버림 더미를 섞어 감염 덱 위에 올림.
// - 확산: 어떤 도시가 이미 3개인 색에 또 큐브가 놓이면, 그 색은 놓지 않고
//   확산 마커 +1, 연결된 모든 도시에 같은 색 큐브 1개씩. 연쇄 확산도 같은
//   방식으로 처리하되, "이번 감염 카드 한 장을 처리하는 동안 이미 확산한
//   도시" 집합(visited)을 공유해서 무한 루프와 중복 확산을 막는다.
import { CITIES } from './map'
import type { CityId, DiseaseColor, GameState, LogEntry } from './types'

export const INFECTION_RATE_TRACK = [2, 2, 2, 3, 3, 4, 4] as const

function cloneCubes(cubes: GameState['cubes']): GameState['cubes'] {
  const out: GameState['cubes'] = {}
  for (const [city, byColor] of Object.entries(cubes)) out[city] = { ...byColor }
  return out
}

export function totalCubesOnBoard(state: GameState, color: DiseaseColor): number {
  let sum = 0
  for (const byColor of Object.values(state.cubes)) sum += byColor[color] ?? 0
  return sum
}

function isProtectedByQuarantine(state: GameState, city: CityId): boolean {
  for (const p of Object.values(state.players)) {
    if (p.job !== 'quarantineSpecialist') continue
    if (p.location === city) return true
    if (CITIES[p.location].connections.includes(city)) return true
  }
  return false
}

function medicPresent(state: GameState, city: CityId): boolean {
  return Object.values(state.players).some((p) => p.job === 'medic' && p.location === city)
}

/**
 * 도시 하나에 특정 색 큐브 amount개를 놓으려 시도한다 (전염 카드는 3개,
 * 평상시 감염/확산 전파는 1개). 연쇄 확산까지 전부 처리하고 최종 상태를
 * 돌려준다. visited는 "이번 카드 한 장" 동안 이미 확산한 도시 집합 —
 * 호출부에서 카드 한 장당 새로 만들어서 넘겨야 한다.
 */
export function infectCity(
  state: GameState,
  city: CityId,
  color: DiseaseColor,
  amount: number,
  visited: Set<CityId> = new Set(),
): GameState {
  if (state.result) return state
  if (state.eradicated[color]) return state

  const cubes = cloneCubes(state.cubes)
  const cubeSupply = { ...state.cubeSupply }
  const log: LogEntry[] = []
  let outbreakCount = state.outbreakCount
  let result: GameState['result'] = null
  let loseReason: string | null = null

  const placeOne = (target: CityId) => {
    if (result) return
    if (state.eradicated[color]) return
    if (isProtectedByQuarantine(state, target)) return
    if (medicPresent(state, target) && state.cured[color]) return // 위생병: 치료된 질병은 자동으로 막는다

    const current = cubes[target]?.[color] ?? 0
    if (current >= 3) {
      if (visited.has(target)) return // 이미 이번 카드에서 확산한 도시 - 다시 확산하지 않는다
      visited.add(target)
      outbreakCount += 1
      log.push({ turn: state.turn, text: `⚠️ ${CITIES[target].name}에서 ${colorName(color)} 질병이 확산되었습니다!`, tag: 'epidemic' })
      if (outbreakCount >= 8) {
        result = 'lose'
        loseReason = '확산이 8회 발생했습니다.'
        return
      }
      for (const neighbor of CITIES[target].connections) placeOne(neighbor)
      return
    }
    if (cubeSupply[color] <= 0) {
      result = 'lose'
      loseReason = `${colorName(color)} 큐브가 모두 소진되었습니다.`
      return
    }
    cubes[target] = { ...cubes[target], [color]: current + 1 }
    cubeSupply[color] -= 1
  }

  for (let i = 0; i < amount; i++) {
    placeOne(city)
    if (result) break
  }

  const hadChain = visited.size > 1
  if (hadChain) log.push({ turn: state.turn, text: '⚠️ 연쇄 확산이 발생했습니다!', tag: 'epidemic' })

  return {
    ...state,
    cubes,
    cubeSupply,
    outbreakCount,
    result: result ?? state.result,
    loseReason: loseReason ?? state.loseReason,
    log: [...log.reverse(), ...state.log],
  }
}

export function colorName(color: DiseaseColor): string {
  switch (color) {
    case 'blue':
      return '파란색'
    case 'yellow':
      return '노란색'
    case 'black':
      return '검은색'
    case 'red':
      return '빨간색'
  }
}

/** 도시 감염 단계: 감염률 트랙 숫자만큼 감염 카드를 뽑아 각각 큐브 1개. */
export function cityInfectionStep(state: GameState): GameState {
  if (state.result) return state
  const drawCount = INFECTION_RATE_TRACK[Math.min(state.infectionRateIndex, INFECTION_RATE_TRACK.length - 1)]
  let s = state
  for (let i = 0; i < drawCount; i++) {
    if (s.result) break
    if (s.infectionDeck.length === 0) break
    const [cardCity, ...restDeck] = s.infectionDeck
    const color = CITIES[cardCity].color
    s = { ...s, infectionDeck: restDeck, infectionDiscard: [...s.infectionDiscard, cardCity] }
    s = infectCity(s, cardCity, color, 1, new Set())
  }
  return s
}

/** 전염 카드 처리: 감염률 증가 -> 감염 덱 맨 아래 카드로 큐브 3개 -> 감염
 * 버림 더미를 섞어 감염 덱 위에 올린다. */
export function resolveEpidemic(state: GameState, rng: { shuffle: <T>(items: readonly T[]) => T[] }): GameState {
  if (state.result) return state
  const nextIndex = Math.min(state.infectionRateIndex + 1, INFECTION_RATE_TRACK.length - 1)
  let s: GameState = {
    ...state,
    infectionRateIndex: nextIndex,
    log: [{ turn: state.turn, text: '전염 카드가 등장했습니다.', tag: 'epidemic' }, ...state.log],
  }
  if (s.infectionDeck.length === 0) return s

  const bottomCity = s.infectionDeck[s.infectionDeck.length - 1]
  const restDeck = s.infectionDeck.slice(0, -1)
  const color = CITIES[bottomCity].color
  s = { ...s, infectionDeck: restDeck, infectionDiscard: [...s.infectionDiscard, bottomCity] }
  s = infectCity(s, bottomCity, color, 3, new Set())
  if (s.result) return s

  const reshuffled = rng.shuffle(s.infectionDiscard)
  s = {
    ...s,
    infectionDeck: [...reshuffled, ...s.infectionDeck],
    infectionDiscard: [],
  }
  return s
}
