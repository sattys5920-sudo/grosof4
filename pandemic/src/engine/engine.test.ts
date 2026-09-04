// 팬데믹 솔로 엔진 검증. 항목 37 "중요한 구현 원칙"과 항목 40 "최종 목표"에
// 나온 핵심 흐름(이동 -> 행동 4회 -> 카드 2장 -> 전염 -> 감염 -> 확산 ->
// 턴 종료)이 실제로 정확히 돌아가는지를 우선 검증한다.
import { beforeAll, describe, expect, it } from 'vitest'
import { CITIES, CITY_IDS, START_CITY, citiesOfColor, isAdjacent } from './map'
import { createInitialState, discardCard, endActionsIfDone, STATIONS_MAX } from './gameEngine'
import { buildStation, dispatcherMove, discoverCure, driveTo, otherPlayerId, shareKnowledge, treatDisease } from './actions'
import { infectCity, resolveEpidemic, totalCubesOnBoard } from './infection'
import { saveGame, loadGame, clearGame } from './save'
import type { CityId, DiseaseColor, GameState, PlayerState } from './types'
import { Rng } from './rng'

beforeAll(() => {
  const store = new Map<string, string>()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage
})

function freshState(): GameState {
  return createInitialState('normal')
}

function mockPlayer(id: 'p1' | 'p2', overrides: Partial<PlayerState> = {}): PlayerState {
  return { id, job: 'researcher', location: START_CITY, hand: [], contingencyCard: null, ...overrides }
}

describe('지도 데이터 무결성', () => {
  it('도시는 정확히 48개, 색상별로 12개씩이다', () => {
    expect(CITY_IDS.length).toBe(48)
    for (const color of ['blue', 'yellow', 'black', 'red'] as DiseaseColor[]) {
      expect(citiesOfColor(color).length).toBe(12)
    }
  })

  it('모든 연결 관계는 대칭이다 (A가 B와 연결되면 B도 A와 연결)', () => {
    for (const id of CITY_IDS) {
      for (const conn of CITIES[id].connections) {
        expect(CITIES[conn], `${id} -> ${conn} 대상 도시가 존재해야 한다`).toBeDefined()
        expect(CITIES[conn].connections, `${conn}은 ${id}로 다시 연결돼야 한다`).toContain(id)
      }
    }
  })

  it('자기 자신과 연결되거나 중복 연결된 도시는 없다', () => {
    for (const id of CITY_IDS) {
      const conns = CITIES[id].connections
      expect(conns).not.toContain(id)
      expect(new Set(conns).size).toBe(conns.length)
    }
  })

  it('모든 도시는 최소 1개 이상 연결돼 있다', () => {
    for (const id of CITY_IDS) {
      expect(CITIES[id].connections.length).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('초기 세팅', () => {
  it('두 플레이어 모두 애틀랜타에서 시작하고, 애틀랜타에 연구소가 있다', () => {
    const s = freshState()
    expect(s.players.p1.location).toBe('atlanta')
    expect(s.players.p2.location).toBe('atlanta')
    expect(s.stations).toEqual(['atlanta'])
  })

  it('두 직업은 서로 다르다', () => {
    const s = freshState()
    expect(s.players.p1.job).not.toBe(s.players.p2.job)
  })

  it('손패는 4장씩, 총 8장이 나갔다', () => {
    const s = freshState()
    expect(s.players.p1.hand.length).toBe(4)
    expect(s.players.p2.hand.length).toBe(4)
  })

  it('초기 감염으로 9장이 소모되고 큐브 3+3+3/2+2+2/1+1+1개가 깔린다', () => {
    const s = freshState()
    expect(s.infectionDiscard.length).toBe(9)
    let total = 0
    for (const byColor of Object.values(s.cubes)) {
      total += Object.values(byColor).reduce((a, b) => a + (b ?? 0), 0)
    }
    expect(total).toBe(3 * 3 + 3 * 2 + 3 * 1)
  })

  it('난이도에 따라 전염 카드 개수가 다르다 (쉬움 4, 보통 5, 어려움 6)', () => {
    const countEpidemics = (s: GameState) => s.playerDeck.filter((c) => c.kind === 'epidemic').length
    expect(countEpidemics(createInitialState('easy'))).toBe(4)
    expect(countEpidemics(createInitialState('normal'))).toBe(5)
    expect(countEpidemics(createInitialState('hard'))).toBe(6)
  })
})

describe('이동은 실제 연결 관계만 허용한다', () => {
  it('연결되지 않은 도시로는 인접 이동할 수 없다', () => {
    const s = freshState()
    expect(isAdjacent('atlanta', 'tokyo')).toBe(false)
    const next = driveTo(s, 'p1', 'tokyo')
    expect(next.players.p1.location).toBe('atlanta') // 변화 없음
  })

  it('연결된 도시로는 이동하고 행동을 1 소모한다', () => {
    const s = freshState()
    const neighbor = CITIES['atlanta'].connections[0]
    const next = driveTo(s, 'p1', neighbor)
    expect(next.players.p1.location).toBe(neighbor)
    expect(next.actionsLeft).toBe(3)
  })
})

describe('턴 구조: 행동 4회 -> 카드 2장 -> 감염 -> 턴 종료', () => {
  it('행동을 4번 쓰면 자동으로 카드를 뽑고 감염까지 처리한 뒤 다음 플레이어로 넘어간다', () => {
    let s = freshState()
    for (let i = 0; i < 4; i++) {
      s = driveTo(s, 'p1', s.players.p1.location === 'atlanta' ? CITIES['atlanta'].connections[0] : 'atlanta')
      s = endActionsIfDone(s)
    }
    if (s.phase === 'discard') {
      // 손패가 넘치면 테스트에서도 실제로 버려서 진행시킨다
      while (s.phase === 'discard') {
        const pid = s.pendingDiscards[0]
        s = discardCard(s, pid, 0)
      }
    }
    expect(s.result === 'lose' || s.currentPlayer === 'p2').toBe(true)
    if (s.result !== 'lose') {
      expect(s.actionsLeft).toBe(4)
      expect(s.phase).toBe('actions')
    }
  })
})

describe('확산과 연쇄 확산', () => {
  it('4번째 큐브가 놓이면 확산하고, 확산 마커가 오른다', () => {
    let s = freshState()
    const city = 'algiers'
    const color: DiseaseColor = 'black'
    // 초기 무작위 감염을 지우고 깨끗한 보드에서 시작한다 (이웃 도시가 우연히
    // 이미 3개 차 있으면 연쇄 확산까지 같이 일어나 테스트가 불안정해진다).
    s = { ...s, cubes: { [city]: { [color]: 3 } } }
    const before = s.outbreakCount
    s = infectCity(s, city, color, 1, new Set())
    expect(s.outbreakCount).toBe(before + 1)
    // 연결된 도시들에도 큐브가 1개씩 퍼졌어야 한다
    for (const neighbor of CITIES[city].connections) {
      expect(s.cubes[neighbor]?.[color] ?? 0).toBeGreaterThanOrEqual(1)
    }
  })

  it('한 번의 감염 처리에서 같은 도시가 두 번 확산하지 않는다 (무한 루프 방지)', () => {
    let s = freshState()
    // algiers <-> istanbul <-> cairo <-> algiers 처럼 서로 얽힌 도시들을 전부 3개씩 채워
    // 확산이 서로를 끝없이 되먹임하지 않는지 확인한다.
    const ring: CityId[] = ['algiers', 'istanbul', 'cairo']
    const color: DiseaseColor = 'black'
    // 초기 무작위 감염을 지우고 깨끗한 보드에서 시작한다 (링 밖의 이웃 도시가
    // 우연히 이미 3개 차 있으면 예상보다 확산이 더 일어나 테스트가 불안정해진다).
    let cubes: GameState['cubes'] = {}
    for (const c of ring) cubes = { ...cubes, [c]: { [color]: 3 } }
    s = { ...s, cubes }
    // 크래시 없이, 유한 시간 내에 끝나야 한다 (호출 자체가 끝나면 통과)
    const result = infectCity(s, 'algiers', color, 1, new Set())
    expect(result).toBeDefined()
    expect(result.outbreakCount).toBeLessThanOrEqual(ring.length + 1)
  })

  it('확산이 8회 발생하면 즉시 패배한다', () => {
    let s = freshState()
    s = { ...s, outbreakCount: 7 }
    s = { ...s, cubes: { ...s.cubes, algiers: { black: 3 } } }
    s = infectCity(s, 'algiers', 'black', 1, new Set())
    expect(s.result).toBe('lose')
    expect(s.loseReason).toContain('확산')
  })
})

describe('질병 큐브 소진', () => {
  it('공급 큐브가 없는데 놓아야 하면 즉시 패배한다', () => {
    let s = freshState()
    s = { ...s, cubeSupply: { ...s.cubeSupply, red: 0 } }
    s = infectCity(s, 'tokyo', 'red', 1, new Set())
    expect(s.result).toBe('lose')
    expect(s.loseReason).toContain('빨간색')
  })
})

describe('치료제 개발과 근절, 승리', () => {
  it('4개 색을 모두 치료하면 즉시 승리한다', () => {
    let s = freshState()
    s = { ...s, players: { ...s.players, p1: mockPlayer('p1', { location: 'atlanta' }) } }
    const cityCard = (city: CityId) => ({ kind: 'city' as const, city })
    for (const color of ['blue', 'yellow', 'black'] as DiseaseColor[]) {
      s = { ...s, cured: { ...s.cured, [color]: true } }
    }
    const redCities = citiesOfColor('red').slice(0, 5)
    s = { ...s, players: { ...s.players, p1: { ...s.players.p1, hand: redCities.map(cityCard) } } }
    s = discoverCure(s, 'p1', 'red')
    expect(s.cured.red).toBe(true)
    expect(s.result).toBe('win')
  })

  it('과학자는 같은 색 카드 4장만으로 치료제를 개발한다', () => {
    let s = freshState()
    s = { ...s, players: { ...s.players, p1: mockPlayer('p1', { job: 'scientist', location: 'atlanta' }) } }
    const blueCities = citiesOfColor('blue').slice(0, 4)
    s = { ...s, players: { ...s.players, p1: { ...s.players.p1, hand: blueCities.map((city) => ({ kind: 'city' as const, city })) } } }
    s = discoverCure(s, 'p1', 'blue')
    expect(s.cured.blue).toBe(true)
  })

  it('치료제가 개발된 색은 보드에서 큐브가 모두 사라지면 근절 표시된다', () => {
    let s = freshState()
    s = { ...s, cured: { ...s.cured, blue: true }, cubes: { atlanta: { blue: 2 } } }
    s = treatDisease(s, 'p1', 'blue')
    expect(totalCubesOnBoard(s, 'blue')).toBe(0)
    expect(s.eradicated.blue).toBe(true)
  })
})

describe('직업 능력', () => {
  it('위생병은 치료 1회로 해당 색 큐브를 전부 제거한다', () => {
    let s = freshState()
    s = { ...s, players: { ...s.players, p1: mockPlayer('p1', { job: 'medic', location: 'atlanta' }) } }
    s = { ...s, cubes: { atlanta: { blue: 3 } } }
    s = treatDisease(s, 'p1', 'blue')
    expect(s.cubes.atlanta?.blue ?? 0).toBe(0)
  })

  it('연구원은 정보 공유 시 자신의 손에 있는 아무 도시 카드나 줄 수 있다', () => {
    let s = freshState()
    s = {
      ...s,
      players: {
        p1: mockPlayer('p1', { job: 'researcher', location: 'atlanta', hand: [{ kind: 'city', city: 'tokyo' }] }),
        p2: mockPlayer('p2', { location: 'atlanta' }),
      },
    }
    s = shareKnowledge(s, 'p1', 'p2', 'tokyo')
    expect(s.players.p1.hand.length).toBe(0)
    expect(s.players.p2.hand.some((c) => c.kind === 'city' && c.city === 'tokyo')).toBe(true)
  })

  it('연구원이 아니면 정보 공유는 현재 위치 도시 카드만 줄 수 있다', () => {
    let s = freshState()
    s = {
      ...s,
      players: {
        p1: mockPlayer('p1', { job: 'dispatcher', location: 'atlanta', hand: [{ kind: 'city', city: 'tokyo' }] }),
        p2: mockPlayer('p2', { location: 'atlanta' }),
      },
    }
    const next = shareKnowledge(s, 'p1', 'p2', 'tokyo')
    expect(next.players.p1.hand.length).toBe(1) // 실패, 변화 없음
  })

  it('검역관이 있는 도시와 그 연결 도시는 큐브가 놓이지 않는다', () => {
    let s = freshState()
    s = { ...s, cubes: {}, players: { ...s.players, p1: mockPlayer('p1', { job: 'quarantineSpecialist', location: 'algiers' }) } }
    const neighbor = CITIES['algiers'].connections[0]
    s = infectCity(s, neighbor, CITIES[neighbor].color, 1, new Set())
    expect(s.cubes[neighbor]?.[CITIES[neighbor].color] ?? 0).toBe(0)
  })

  it('운항 관리자는 다른 플레이어의 말을 대신 이동시킬 수 있다', () => {
    let s = freshState()
    s = {
      ...s,
      players: {
        p1: mockPlayer('p1', { job: 'dispatcher', location: 'atlanta' }),
        p2: mockPlayer('p2', { location: 'atlanta' }),
      },
    }
    const neighbor = CITIES['atlanta'].connections[0]
    s = dispatcherMove(s, 'p1', 'p2', 'drive', neighbor)
    expect(s.players.p2.location).toBe(neighbor)
    expect(s.actionsLeft).toBe(3) // 운항 관리자(p1)의 행동을 소모
  })
})

describe('전염 카드', () => {
  it('감염률을 올리고, 감염 덱 맨 아래 도시에 큐브 3개를 놓고, 버림 더미를 감염 덱 위로 되돌린다', () => {
    let s = freshState()
    // 검역관이 무작위로 배정되면 애틀랜타/그 인접 도시는 큐브가 안 놓이는 게
    // 정상 동작이라, 이 테스트에서는 그런 간섭이 없는 직업으로 고정해 둔다.
    s = {
      ...s,
      players: {
        p1: mockPlayer('p1', { job: 'researcher' }),
        p2: mockPlayer('p2', { job: 'dispatcher' }),
      },
    }
    const bottomCity = s.infectionDeck[s.infectionDeck.length - 1]
    const rng = new Rng(1)
    const before = s.infectionRateIndex
    s = { ...s, infectionDiscard: [s.infectionDeck[0]] }
    const deckSizeBefore = s.infectionDeck.length
    s = resolveEpidemic(s, rng)
    expect(s.infectionRateIndex).toBe(before + 1)
    expect(s.cubes[bottomCity]?.[CITIES[bottomCity].color] ?? 0).toBeGreaterThanOrEqual(3)
    expect(s.infectionDiscard.length).toBe(0)
    // 맨 아래 1장이 빠지고, 미리 넣어둔 버림 카드 1장 + 방금 감염된 카드 1장이
    // 다시 덱 위로 얹힌다: (deckSizeBefore - 1) + 2
    expect(s.infectionDeck.length).toBe(deckSizeBefore + 1)
  })
})

describe('연구소', () => {
  it('연구소는 최대 6개, 이미 6개면 기존 것을 옮겨야 새로 지을 수 있다', () => {
    let s = freshState()
    const sixCities = CITY_IDS.slice(0, STATIONS_MAX)
    s = { ...s, stations: sixCities }
    s = {
      ...s,
      players: { ...s.players, p1: mockPlayer('p1', { location: 'tokyo', hand: [{ kind: 'city', city: 'tokyo' }] }) },
    }
    const failed = buildStation(s, 'p1')
    expect(failed.stations.length).toBe(STATIONS_MAX) // relocateFrom 없이는 실패

    const ok = buildStation(s, 'p1', sixCities[0])
    expect(ok.stations.length).toBe(STATIONS_MAX)
    expect(ok.stations).toContain('tokyo')
    expect(ok.stations).not.toContain(sixCities[0])
  })
})

describe('저장/불러오기', () => {
  it('저장한 뒤 불러오면 상태가 그대로 복원된다', () => {
    const s = freshState()
    saveGame(s)
    const loaded = loadGame()
    expect(loaded).not.toBeNull()
    expect(loaded?.players.p1.job).toBe(s.players.p1.job)
    expect(loaded?.stations).toEqual(s.stations)
    clearGame()
    expect(loadGame()).toBeNull()
  })
})

describe('플레이어 카드 덱 소진', () => {
  it('플레이어 덱이 다 떨어진 상태로 카드를 뽑아야 하면 즉시 패배한다', () => {
    let s = freshState()
    s = { ...s, playerDeck: [] }
    // drawPhase는 gameEngine 내부 함수라 endActionsIfDone을 통해 트리거한다
    s = { ...s, actionsLeft: 0 }
    s = endActionsIfDone(s)
    expect(s.result).toBe('lose')
    expect(s.loseReason).toContain('플레이어 카드 덱')
  })
})

describe('상대 플레이어 헬퍼', () => {
  it('otherPlayerId는 p1<->p2를 뒤집는다', () => {
    expect(otherPlayerId('p1')).toBe('p2')
    expect(otherPlayerId('p2')).toBe('p1')
  })
})
