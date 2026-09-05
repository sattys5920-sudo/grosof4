// 장소별 탐색 카드 더미. 장소마다 색깔이 다르게, 몇 종류를 원본씩 넣었다
// — 나중에 위기 기여·전투·치료 등에서 이 아이템들을 실제로 소모하는
// 효과는 그 시스템을 만드는 STEP에서 하나씩 연결한다.
import type { ItemType, SearchableLocationId } from './types'

export const ITEM_TYPES: ItemType[] = [
  { id: 'gasMask', name: '방독면', icon: '😷', locationId: 'police' },
  { id: 'shotgun', name: '산탄총', icon: '💥', locationId: 'police' },
  { id: 'vest', name: '방탄조끼', icon: '🦺', locationId: 'police' },
  { id: 'radio', name: '무전기', icon: '📻', locationId: 'police' },

  { id: 'cannedFood', name: '통조림', icon: '🥫', locationId: 'grocery' },
  { id: 'waterJug', name: '물통', icon: '🚰', locationId: 'grocery' },
  { id: 'lighter', name: '라이터', icon: '🔥', locationId: 'grocery' },
  { id: 'salt', name: '소금', icon: '🧂', locationId: 'grocery' },

  { id: 'bandage', name: '붕대', icon: '🩹', locationId: 'school' },
  { id: 'flashlight', name: '손전등', icon: '🔦', locationId: 'school' },
  { id: 'backpack', name: '배낭', icon: '🎒', locationId: 'school' },
  { id: 'notebook', name: '공책', icon: '📓', locationId: 'school' },

  { id: 'fuelCan', name: '연료통', icon: '⛽', locationId: 'gasStation' },
  { id: 'toolkit', name: '정비 도구', icon: '🧰', locationId: 'gasStation' },
  { id: 'map', name: '지도', icon: '🗺️', locationId: 'gasStation' },
  { id: 'rope', name: '밧줄', icon: '🪢', locationId: 'gasStation' },

  { id: 'atlas', name: '지도책', icon: '📖', locationId: 'library' },
  { id: 'manual', name: '무전기 설명서', icon: '📔', locationId: 'library' },
  { id: 'newspaper', name: '오래된 신문', icon: '📰', locationId: 'library' },
  { id: 'compass', name: '나침반', icon: '🧭', locationId: 'library' },

  { id: 'painkiller', name: '진통제', icon: '💊', locationId: 'hospital' },
  { id: 'antibiotics', name: '항생제', icon: '💉', locationId: 'hospital' },
  { id: 'surgicalKit', name: '수술 도구', icon: '🩺', locationId: 'hospital' },
  { id: 'medBandage', name: '의료용 붕대', icon: '🩹', locationId: 'hospital' },
]

export const ITEM_TYPE_MAP: Record<string, ItemType> = ITEM_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.id]: t }),
  {} as Record<string, ItemType>,
)

/** 이 장소의 탐색 카드 더미(아이템 종류 id 목록)를 뽑아 온다. */
export function itemsForLocation(locationId: SearchableLocationId): ItemType[] {
  return ITEM_TYPES.filter((t) => t.locationId === locationId)
}
