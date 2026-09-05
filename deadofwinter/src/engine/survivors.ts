// 오리지널 생존자 12명. 실제 상용 보드게임의 캐릭터·일러스트는 쓰지 않고,
// 눈보라에 갇힌 마을 사람들이라는 콘셉트로 새로 지었다. ability는 지금은
// 설명 텍스트일 뿐이고, 실제 효과는 그 능력이 걸리는 시스템(이동·전투·
// 탐색 등)을 만드는 STEP에서 하나씩 구현해 넣는다.
import type { Survivor } from './types'

export const SURVIVORS: Survivor[] = [
  { id: 'sv1', name: '한도경', title: '전직 형사', influence: 2, attack: 2, ability: '공격 판정에 +1', icon: '🕵️' },
  { id: 'sv2', name: '오미래', title: '응급실 간호사', influence: 2, attack: 1, ability: '치료 아이템 효과 +1', icon: '👩‍⚕️' },
  { id: 'sv3', name: '백준서', title: '정비공', influence: 1, attack: 1, ability: '바리케이드 설치 시 주사위 소모 없음(1회)', icon: '🔧' },
  { id: 'sv4', name: '강하늘', title: '고등학생', influence: 1, attack: 1, ability: '탐색 시 카드를 한 장 더 본다', icon: '🎒' },
  { id: 'sv5', name: '윤설아', title: '수의사', influence: 2, attack: 1, ability: '동상 판정에 유리한 보정', icon: '🩺' },
  { id: 'sv6', name: '조태민', title: '트럭 운전사', influence: 2, attack: 2, ability: '이동 시 노출 판정 -1 보정', icon: '🚚' },
  { id: 'sv7', name: '민서율', title: '약사', influence: 2, attack: 1, ability: '위기 기여 시 아이템 하나 더 낼 수 있음', icon: '💊' },
  { id: 'sv8', name: '장은호', title: '사냥꾼', influence: 3, attack: 3, ability: '좀비 공격 판정에 +1', icon: '🏹' },
  { id: 'sv9', name: '노해든', title: '농부', influence: 1, attack: 1, ability: '식량 소모 -1(라운드당 한 번)', icon: '🌾' },
  { id: 'sv10', name: '표은채', title: '전직 소방관', influence: 2, attack: 2, ability: '동료를 구출할 때 추가 판정 없이 성공', icon: '🧯' },
  { id: 'sv11', name: '심유담', title: '무전기 수리공', influence: 1, attack: 1, ability: '크로스로드 카드를 한 번 다시 뽑을 수 있음(1회)', icon: '📻' },
  { id: 'sv12', name: '문가온', title: '전직 군인', influence: 3, attack: 3, ability: '공격 시 노출 판정을 받지 않는다(1회)', icon: '🎖️' },
]

export const SURVIVOR_MAP: Record<string, Survivor> = SURVIVORS.reduce(
  (acc, s) => ({ ...acc, [s.id]: s }),
  {} as Record<string, Survivor>,
)
