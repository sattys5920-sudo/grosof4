import { describe, it, expect } from 'vitest'
import { LOCATIONS, LOCATION_MAP } from './locations'

describe('LOCATIONS', () => {
  it('콜로니 + 6개 외부 장소 = 7곳이다', () => {
    expect(LOCATIONS).toHaveLength(7)
  })

  it('콜로니가 첫 번째다', () => {
    expect(LOCATIONS[0].id).toBe('colony')
  })

  it('id가 전부 유일하다', () => {
    const ids = LOCATIONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 장소에 이름과 아이콘이 있다', () => {
    for (const loc of LOCATIONS) {
      expect(loc.name.length).toBeGreaterThan(0)
      expect(loc.icon.length).toBeGreaterThan(0)
    }
  })

  it('LOCATION_MAP으로 id 조회가 된다', () => {
    expect(LOCATION_MAP.colony.name).toBe('콜로니')
    expect(LOCATION_MAP.hospital.name).toBe('병원')
  })
})
