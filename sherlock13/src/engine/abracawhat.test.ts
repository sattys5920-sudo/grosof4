import { describe, expect, it } from 'vitest'
import { ALL_SPELLS, DIFFICULTY_CONFIG, SPELL_MAP, pickActiveSpells, rollHandCounts, resolveDeclare } from './abracawhat'
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

describe('pickActiveSpells', () => {
  it('요청한 개수만큼, 서로 다른 마법 id를 뽑는다', () => {
    for (const diff of ['easy', 'normal', 'hard'] as const) {
      const count = DIFFICULTY_CONFIG[diff].spellTypeCount
      const ids = pickActiveSpells(count, seededRng(1))
      expect(ids.length).toBe(count)
      expect(new Set(ids).size).toBe(count)
    }
  })
})

describe('rollHandCounts', () => {
  it('보유량 합계가 요청한 타일 수와 같다', () => {
    const active = pickActiveSpells(5, seededRng(2))
    const counts = rollHandCounts(active, 8, seededRng(3))
    const total = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0)
    expect(total).toBe(8)
  })

  it('활성 마법 종류 밖에서는 안 나온다', () => {
    const active = pickActiveSpells(5, seededRng(4))
    const counts = rollHandCounts(active, 20, seededRng(5))
    const activeSet = new Set(active)
    for (const id of Object.keys(counts) as SpellId[]) expect(activeSet.has(id)).toBe(true)
  })
})

describe('resolveDeclare', () => {
  it('남은 개수가 있으면 성공하고 그 개수를 하나 줄인다', () => {
    const result = resolveDeclare({ fire: 2, wind: 1 }, 'fire')
    expect(result.success).toBe(true)
    expect(result.nextRemaining.fire).toBe(1)
    expect(result.nextRemaining.wind).toBe(1)
  })

  it('남은 개수가 0이거나 없으면 실패하고 remaining은 그대로다', () => {
    const remaining = { fire: 0, wind: 2 }
    const result = resolveDeclare(remaining, 'fire')
    expect(result.success).toBe(false)
    expect(result.nextRemaining).toBe(remaining)
  })

  it('아예 갖고 있지 않던 마법도 실패로 판정한다', () => {
    const result = resolveDeclare({ fire: 3 }, 'ice')
    expect(result.success).toBe(false)
  })
})
