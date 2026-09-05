import { describe, expect, it } from 'vitest'
import { shuffle, dealGame, countTrait, possibleCriminals, generateRoomCode } from './logic'
import { SUSPECTS, SUSPECT_MAP, TRAITS } from './suspects'
import type { TraitId } from './types'

function seededRng(seed: number): () => number {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

describe('용의자 데이터', () => {
  it('정확히 13명이고 id가 모두 다르다', () => {
    expect(SUSPECTS.length).toBe(13)
    expect(new Set(SUSPECTS.map((s) => s.id)).size).toBe(13)
  })

  it('모든 용의자는 성별 특징을 하나만 갖고, 특징이 2개 이상이다', () => {
    for (const s of SUSPECTS) {
      const genderCount = s.traits.filter((t) => t === 'male' || t === 'female').length
      expect(genderCount).toBe(1)
      expect(s.traits.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('용의자의 모든 특징 id는 TRAITS 목록 안에 있다', () => {
    const known = new Set(TRAITS.map((t) => t.id))
    for (const s of SUSPECTS) {
      for (const t of s.traits) expect(known.has(t)).toBe(true)
    }
  })

  it('특징마다 최소 1명, 최대 12명은 갖고 있다 (질문이 의미 있으려면)', () => {
    for (const trait of TRAITS) {
      const count = SUSPECTS.filter((s) => s.traits.includes(trait.id)).length
      expect(count).toBeGreaterThan(0)
      expect(count).toBeLessThan(13)
    }
  })
})

describe('shuffle', () => {
  it('같은 시드면 항상 같은 순서를 만든다', () => {
    const a = shuffle([1, 2, 3, 4, 5], seededRng(42))
    const b = shuffle([1, 2, 3, 4, 5], seededRng(42))
    expect(a).toEqual(b)
  })

  it('원소 집합은 그대로 유지된다', () => {
    const result = shuffle([1, 2, 3, 4, 5], seededRng(7))
    expect([...result].sort()).toEqual([1, 2, 3, 4, 5])
  })
})

describe('dealGame', () => {
  it('13명이 아니면 에러를 던진다', () => {
    expect(() => dealGame(SUSPECTS.slice(0, 12))).toThrow()
  })

  it('호스트 5장 + 게스트 5장 + 중앙 3장 = 13장이 겹치지 않고 전부 나뉜다', () => {
    const deal = dealGame(SUSPECTS, seededRng(1))
    expect(deal.hostHand.length).toBe(5)
    expect(deal.guestHand.length).toBe(5)
    const all = [...deal.hostHand, ...deal.guestHand, deal.leftId, deal.criminalId, deal.rightId]
    expect(new Set(all).size).toBe(13)
    expect(all.length).toBe(13)
  })

  it('같은 시드면 항상 같은 판이 나온다 (재현 가능)', () => {
    const a = dealGame(SUSPECTS, seededRng(99))
    const b = dealGame(SUSPECTS, seededRng(99))
    expect(a).toEqual(b)
  })
})

describe('countTrait', () => {
  it('손패 안에서 특징을 가진 용의자 수를 정확히 센다', () => {
    const hatOwners = SUSPECTS.filter((s) => s.traits.includes('hat')).map((s) => s.id)
    const hand = hatOwners.slice(0, 2).concat(SUSPECTS.find((s) => !s.traits.includes('hat'))!.id)
    expect(countTrait(hand, SUSPECT_MAP, 'hat' as TraitId)).toBe(2)
  })

  it('빈 손패는 0을 돌려준다', () => {
    expect(countTrait([], SUSPECT_MAP, 'glasses')).toBe(0)
  })
})

describe('possibleCriminals', () => {
  it('내 손패와 공개된 중앙 카드를 제외한 나머지만 남긴다', () => {
    const myHand = SUSPECTS.slice(0, 5).map((s) => s.id)
    const revealed = [SUSPECTS[5].id]
    const result = possibleCriminals(SUSPECTS, myHand, revealed)
    expect(result.length).toBe(13 - 5 - 1)
    expect(result.some((s) => myHand.includes(s.id))).toBe(false)
    expect(result.some((s) => s.id === revealed[0])).toBe(false)
  })

  it('수동으로 무죄 처리한 용의자도 제외된다', () => {
    const result = possibleCriminals(SUSPECTS, [], [], [SUSPECTS[0].id])
    expect(result.some((s) => s.id === SUSPECTS[0].id)).toBe(false)
    expect(result.length).toBe(12)
  })
})

describe('generateRoomCode', () => {
  it('길이가 맞고, 헷갈리는 0/O/1/I가 안 나온다', () => {
    const code = generateRoomCode(seededRng(5), 4)
    expect(code.length).toBe(4)
    expect(/[0O1I]/.test(code)).toBe(false)
  })

  it('같은 시드면 같은 코드를 만든다', () => {
    expect(generateRoomCode(seededRng(3))).toBe(generateRoomCode(seededRng(3)))
  })
})
