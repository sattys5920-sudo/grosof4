import type { GroupEventSpec, RoomId } from './types'
import { MISSING_STUDENT } from './characters'

export const CLASSROOM_EVENTS: GroupEventSpec[] = [
  {
    title: '정전과 함께 들려온 속삭임',
    description:
      '방금 전 짧은 정전이 있었다. 그 순간 스피커 너머로 무언가 속삭이는 소리를 들은 사람이 여럿이다. 다 같이 기억을 맞춰보자.',
    needed: 4,
    reward: `"미안해, 나 먼저 갈게" — 그 말은 문자가 아니라 그날 밤 옥상에서 누군가 직접 ${MISSING_STUDENT}에게 들었던 말이었다.`,
  },
  {
    title: '복도에 다시 붙은 전단지',
    description: '3년 전 실종 전단지가 밤새 복도 곳곳에 다시 붙었다. 누가, 왜 붙였는지 함께 확인해보자.',
    needed: 5,
    reward: `전단지 사진 속 ${MISSING_STUDENT}의 손목에 채워진 팔찌 — 지금 학교 안 어딘가에 똑같은 물건이 남아 있다.`,
  },
  {
    title: '운동장에 그려진 표식',
    description: '아침 안개가 걷힌 잠깐 사이, 운동장 한가운데 낯선 표식이 드러났다가 다시 안개에 덮였다.',
    needed: 6,
    reward: '표식은 옥상에서 내려다볼 때만 완전한 모양이 된다 — 그 형태는 방송실 로고와 정확히 일치한다.',
  },
]

export const ROOM_EVENTS: Record<RoomId, GroupEventSpec> = {
  library: {
    title: '뜯겨나간 페이지',
    description: '졸업앨범에서 한 페이지가 통째로 뜯겨나간 흔적을 발견했다. 남은 조각을 맞춰볼 사람이 필요하다.',
    needed: 2,
    reward: '뜯긴 페이지에는 실종 당일 방과 후 일정표가 적혀 있었다 — 마지막 일정은 "옥상 정리".',
  },
  infirmary: {
    title: '잠긴 캐비닛',
    description: '보건실 캐비닛 자물쇠가 3년 전 것과 다른 새 제품으로 바뀌어 있다. 힘을 합쳐 열어보자.',
    needed: 2,
    reward: '캐비닛 안에는 실종 당일 작성된 미제출 상담 신청서 한 장이 남아 있었다.',
  },
  broadcast: {
    title: '되감기는 테이프',
    description: '재생되지 않아야 할 낡은 테이프가 저절로 되감기고 있다. 장비를 같이 살펴봐야 한다.',
    needed: 3,
    reward: '테이프 속 잡음을 걷어내자 3년 전 그날, 실종 직전 방송실에 걸려온 통화 한 통이 들린다.',
  },
  rooftop: {
    title: '난간에 걸린 흔적',
    description: '난간에 걸린 리본 조각이 바람도 없는데 흔들린다. 가까이서 함께 확인해보자.',
    needed: 2,
    reward: `리본 안쪽에 ${MISSING_STUDENT}의 글씨가 아닌, 낯선 필체로 짧은 문장이 적혀 있다: "미안해, 내가 그런 거야."`,
  },
}
