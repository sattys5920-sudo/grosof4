import { describe, expect, it } from 'vitest'
import { createAbracaGame, declareSpell, confirmHandoff, ALL_SPELLS, DIFFICULTY_CONFIG, SPELL_MAP } from './abracawhat'
import type { SpellId } from './abracawhat'

function seededRng(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

describe('마법 데이터', () => {
  it('모든 마법은 id가 서로 다르다', () => {
    expect(new Set(ALL_SPELLS.map((s) => s.id)).size).toBe(ALL_SPELLS.length)
  })

  it('SPELL_MAP은 ALL_SPELLS와 같은 항목을 담는다', () => {
    for (const s of ALL_SPELLS) expect(SPELL_MAP[s.id]).toEqual(s)
  })
})

describe('createAbracaGame', () => {
  it('이름을 비우면 기본 이름(PLAYER 1/2)이 붙는다', () => {
    const state = createAbracaGame('', '  ', 'normal', seededRng(1))
    expect(state.players[0].name).toBe('PLAYER 1')
    expect(state.players[1].name).toBe('PLAYER 2')
  })

  it('이름을 입력하면 그대로 쓴다', () => {
    const state = createAbracaGame('민지', '해린', 'easy', seededRng(2))
    expect(state.players[0].name).toBe('민지')
    expect(state.players[1].name).toBe('해린')
  })

  it('난이도별 마법 종류 수만큼 activeSpellIds가 정해진다', () => {
    for (const diff of ['easy', 'normal', 'hard'] as const) {
      const state = createAbracaGame('A', 'B', diff, seededRng(3))
      expect(state.activeSpellIds.length).toBe(DIFFICULTY_CONFIG[diff].spellTypeCount)
      expect(new Set(state.activeSpellIds).size).toBe(state.activeSpellIds.length)
    }
  })

  it('각 플레이어의 보유량 합계는 난이도별 타일 수와 같다', () => {
    const state = createAbracaGame('A', 'B', 'hard', seededRng(4))
    for (const p of state.players) {
      const total = Object.values(p.counts).reduce((sum, n) => sum + (n ?? 0), 0)
      expect(total).toBe(DIFFICULTY_CONFIG.hard.tilesPerPlayer)
      expect(p.remaining).toEqual(p.counts)
      expect(p.hp).toBe(DIFFICULTY_CONFIG.hard.startingHp)
    }
  })

  it('보유량은 활성 마법 종류 안에서만 나온다', () => {
    const state = createAbracaGame('A', 'B', 'normal', seededRng(5))
    const active = new Set(state.activeSpellIds)
    for (const p of state.players) {
      for (const id of Object.keys(p.counts) as SpellId[]) expect(active.has(id)).toBe(true)
    }
  })

  it('시작은 항상 0번(첫 번째 플레이어) 차례다', () => {
    const state = createAbracaGame('A', 'B', 'normal', seededRng(6))
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.phase).toBe('playing')
    expect(state.winnerIndex).toBeNull()
  })
})

describe('declareSpell', () => {
  it('실제로 갖고 있는 마법을 선언하면 성공 — 상대 체력이 줄고 내 remaining이 줄고 knownMine에 추가된다', () => {
    let state = createAbracaGame('A', 'B', 'normal', seededRng(7))
    const mine = state.players[0]
    const haveId = (Object.keys(mine.counts) as SpellId[])[0]
    const oppHpBefore = state.players[1].hp

    state = declareSpell(state, haveId)

    expect(state.players[1].hp).toBe(oppHpBefore - 1)
    expect(state.players[0].hp).toBe(mine.hp) // 성공했으니 내 체력은 그대로
    expect(state.players[0].remaining[haveId]).toBe((mine.counts[haveId] ?? 0) - 1)
    expect(state.players[0].knownMine).toContain(haveId)
    expect(state.phase).toBe('handoff')
    expect(state.pendingTurnIndex).toBe(1)
  })

  it('갖고 있지 않은 마법을 선언하면 실패 — 내 체력이 줄고 failedMine에 추가된다', () => {
    let state = createAbracaGame('A', 'B', 'normal', seededRng(8))
    const mine = state.players[0]
    const missingId = state.activeSpellIds.find((id) => !(mine.counts[id] ?? 0))
    if (!missingId) return // 이 시드에서 전부 갖고 있으면 스킵(희박하지만 안전하게)

    const myHpBefore = state.players[0].hp
    const oppHpBefore = state.players[1].hp
    state = declareSpell(state, missingId)

    expect(state.players[0].hp).toBe(myHpBefore - 1)
    expect(state.players[1].hp).toBe(oppHpBefore) // 실패했으니 상대는 그대로
    expect(state.players[0].failedMine).toContain(missingId)
    expect(state.phase).toBe('handoff')
  })

  it('체력이 0 이하가 되면 즉시 result 단계로 넘어가고 승자가 정해진다', () => {
    let state = createAbracaGame('A', 'B', 'easy', seededRng(9))
    state = { ...state, players: [{ ...state.players[0] }, { ...state.players[1], hp: 1 }] }
    const haveId = (Object.keys(state.players[0].counts) as SpellId[])[0]

    state = declareSpell(state, haveId)

    expect(state.phase).toBe('result')
    expect(state.winnerIndex).toBe(0)
    expect(state.players[1].hp).toBeLessThanOrEqual(0)
  })

  it('playing 단계가 아니면 던진다', () => {
    let state = createAbracaGame('A', 'B', 'normal', seededRng(10))
    state = { ...state, phase: 'handoff' }
    expect(() => declareSpell(state, state.activeSpellIds[0])).toThrow()
  })
})

describe('confirmHandoff', () => {
  it('handoff 단계에서 다음 차례로 넘긴다', () => {
    let state = createAbracaGame('A', 'B', 'normal', seededRng(11))
    const haveId = (Object.keys(state.players[0].counts) as SpellId[])[0]
    state = declareSpell(state, haveId)
    expect(state.phase).toBe('handoff')

    state = confirmHandoff(state)
    expect(state.phase).toBe('playing')
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.pendingTurnIndex).toBeNull()
  })

  it('handoff 단계가 아니면 아무 변화 없이 그대로 돌려준다', () => {
    const state = createAbracaGame('A', 'B', 'normal', seededRng(12))
    expect(confirmHandoff(state)).toBe(state)
  })
})
