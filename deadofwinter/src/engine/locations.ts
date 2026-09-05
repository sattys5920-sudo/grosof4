// 콜로니(본진)와 6개 외부 장소. 순서는 보드에 표시되는 순서이기도 하다 —
// 콜로니를 가운데 두고 나머지 6곳을 주변에 두는 배치를 UI에서 그대로
// 따른다.
import type { Location, LocationId } from './types'

export const LOCATIONS: Location[] = [
  { id: 'colony', name: '콜로니', icon: '🏕', description: '생존자들의 본진. 식량이 모이고 콜로니 단계가 진행된다.' },
  { id: 'police', name: '경찰서', icon: '🚓', description: '무기와 탄약을 구할 수 있는 곳.' },
  { id: 'grocery', name: '식료품점', icon: '🛒', description: '식량과 생필품이 있는 곳.' },
  { id: 'school', name: '학교', icon: '🏫', description: '의약품과 잡화를 찾을 수 있는 곳.' },
  { id: 'gasStation', name: '주유소', icon: '⛽', description: '연료와 도구를 구할 수 있는 곳.' },
  { id: 'library', name: '도서관', icon: '📚', description: '정보와 특수 아이템을 찾을 수 있는 곳.' },
  { id: 'hospital', name: '병원', icon: '🏥', description: '치료 아이템과 의약품이 모이는 곳.' },
]

export const LOCATION_MAP: Record<LocationId, Location> = LOCATIONS.reduce(
  (acc, loc) => ({ ...acc, [loc.id]: loc }),
  {} as Record<LocationId, Location>,
)
