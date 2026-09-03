import type { JobId, Survivor } from './types'
import type { Rng } from './rng'
import { GAME_RULES } from './rules'

export interface JobDef {
  id: JobId
  name: string
  description: string
}

export const JOBS: Record<JobId, JobDef> = {
  doctor: { id: 'doctor', name: '의사', description: '치료 효과 +50%' },
  engineer: { id: 'engineer', name: '기술자', description: '수리 효과 +50%' },
  hunter: { id: 'hunter', name: '사냥꾼', description: '탐색 성공률 +15%' },
  scout: { id: 'scout', name: '정찰병', description: '정찰 효과 +15%' },
  civilian: { id: 'civilian', name: '일반인', description: '특수 보정 없음' },
  coward: { id: 'coward', name: '겁쟁이', description: '정신력 감소량 +20%' },
  liar: { id: 'liar', name: '거짓말쟁이', description: '신뢰 관련 이벤트 발생 증가' },
}

const NAMES = [
  '민수',
  '지현',
  '태윤',
  '서연',
  '현우',
  '유진',
  '동혁',
  '수아',
  '재원',
  '하은',
  '진호',
  '아영',
]

const PERSONALITIES = [
  '말수가 적다',
  '유난히 낙천적이다',
  '작은 소리에도 예민하다',
  '무엇이든 기록해 둔다',
  '혼자 있는 걸 못 견딘다',
  '규칙을 철저히 따진다',
  '감정을 잘 드러내지 않는다',
  '농담으로 분위기를 풀려 한다',
]

const JOB_POOL: JobId[] = ['doctor', 'engineer', 'hunter', 'scout', 'civilian', 'coward', 'liar']

export function generateSurvivor(rng: Rng, usedNames: string[]): Survivor {
  const pool = NAMES.filter((n) => !usedNames.includes(n))
  const name = rng.pick(pool.length > 0 ? pool : NAMES)
  const job = rng.pick(JOB_POOL)
  const personality = rng.pick(PERSONALITIES)
  return {
    id: `${name}-${Math.floor(rng.next() * 100000)}`,
    name,
    job,
    personality,
    hp: 100,
    trust: 30,
    alive: true,
    infected: false,
    thirst: GAME_RULES.START_THIRST,
    hunger: GAME_RULES.START_HUNGER,
  }
}
