// 13명의 용의자. 실제 상용 보드게임의 캐릭터·일러스트를 그대로 쓰지 않고,
// 빅토리아 시대 런던 탐정 사교계 분위기의 오리지널 인물로 새로 지었다.
import type { Suspect, Trait, TraitId } from './types'

export const TRAITS: Trait[] = [
  { id: 'male', label: '남성', icon: '\u{1F9D1}' },
  { id: 'female', label: '여성', icon: '\u{1F469}' },
  { id: 'hat', label: '모자', icon: '\u{1F3A9}' },
  { id: 'glasses', label: '안경', icon: '\u{1F453}' },
  { id: 'pipe', label: '파이프', icon: '\u{1F6AC}' },
  { id: 'cane', label: '지팡이', icon: '\u{1F9AF}' },
  { id: 'watch', label: '회중시계', icon: '⏱️' },
  { id: 'gloves', label: '장갑', icon: '\u{1F9E4}' },
  { id: 'necklace', label: '장신구', icon: '\u{1F4FF}' },
]

export const TRAIT_MAP: Record<TraitId, Trait> = TRAITS.reduce(
  (acc, t) => ({ ...acc, [t.id]: t }),
  {} as Record<TraitId, Trait>,
)

export const SUSPECTS: Suspect[] = [
  { id: 's1', name: '아처 경감', title: '은퇴한 형사', traits: ['male', 'hat', 'watch'] },
  { id: 's2', name: '마가렛 부인', title: '사교계의 안주인', traits: ['female', 'glasses', 'necklace'] },
  { id: 's3', name: '실비아', title: '골동품 상점 주인', traits: ['female', 'gloves', 'necklace'] },
  { id: 's4', name: '하워드 박사', title: '왕립학회 회원', traits: ['male', 'glasses', 'pipe'] },
  { id: 's5', name: '콜튼 자작', title: '몰락한 귀족', traits: ['male', 'hat', 'cane', 'watch'] },
  { id: 's6', name: '에드먼드', title: '신문 기자', traits: ['male', 'pipe', 'cane'] },
  { id: 's7', name: '그레이스', title: '오페라 가수', traits: ['female', 'hat', 'gloves'] },
  { id: 's8', name: '바틀렛 신부', title: '교구 사제', traits: ['male', 'glasses', 'watch'] },
  { id: 's9', name: '로자린드', title: '피아노 교사', traits: ['female', 'necklace', 'gloves'] },
  { id: 's10', name: '필그림 선장', title: '퇴역 선장', traits: ['male', 'hat', 'pipe', 'watch'] },
  { id: 's11', name: '위니프레드', title: '식물학자', traits: ['female', 'glasses', 'cane'] },
  { id: 's12', name: '서머스 변호사', title: '유언 집행인', traits: ['male', 'cane', 'watch'] },
  { id: 's13', name: '오필리아', title: '화가', traits: ['female', 'hat', 'necklace', 'gloves'] },
]

export const SUSPECT_MAP: Record<string, Suspect> = SUSPECTS.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<string, Suspect>,
)
