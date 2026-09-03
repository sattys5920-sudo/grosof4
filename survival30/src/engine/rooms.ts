import type { RoomId } from './types'

export interface RoomDef {
  id: RoomId
  name: string
}

// 학교 전개도에 배치되는 9개 공간. 순서가 곧 화면에 그려지는 순서다.
export const ROOMS: RoomDef[] = [
  { id: 'classroom', name: '교실' },
  { id: 'facultyOffice', name: '교무실' },
  { id: 'nurseOffice', name: '보건실' },
  { id: 'musicRoom', name: '음악실' },
  { id: 'artRoom', name: '미술실' },
  { id: 'scienceRoom', name: '과학실' },
  { id: 'restroom', name: '화장실' },
  { id: 'danceRoom', name: '무용실' },
  { id: 'techRoom', name: '기술실' },
]
