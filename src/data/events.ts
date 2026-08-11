import type { GroupEventSpec, RoomId } from './types'

export const ROOM_EVENTS: Record<RoomId, GroupEventSpec> = {
  library: {
    title: '대출 순번의 빈칸',
    description: '마지막 다섯 명의 대출자 이름은 지워지고 순번만 남아 있다.',
    kind: 'puzzle',
    category: '패턴',
    puzzleText: '남은 순번: 41, 43, 47, 53, ?\n(힌트: 소수)\n다음 순번을 입력하시오.',
    answer: '59',
    reward: '59번째 대출자는 유민서였다. 그 책은 아직 반납되지 않았다.',
  },
  infirmary: {
    title: '약품 보관함 라벨',
    description: '알파벳 순서로 정리돼야 할 라벨 하나가 비어 있다.',
    kind: 'puzzle',
    category: '관찰',
    puzzleText: '남은 라벨: A, B, D, E, F\n어떤 알파벳이 빠졌는가?',
    answer: 'C',
    reward: 'C 칸만 비어 있다. 그 안에 있던 약이 실종 당일 오후 사라졌다는 기록이 남아 있다.',
  },
  broadcast: {
    title: '멈추지 않는 채널 다이얼',
    description: '장비 채널 다이얼이 같은 숫자를 반복해서 가리킨다.',
    kind: 'puzzle',
    category: '패턴',
    puzzleText: '다이얼이 가리키는 순서: 07 - 16 - 07 - 16 - ?\n다음에 올 숫자를 입력하시오.',
    answer: '07',
    reward: '07:16 — 몇 번을 돌려도 같은 시각을 가리킨다. 그 순간 방송실에서 무슨 일이 있었다는 뜻이다.',
  },
  rooftop: {
    title: '난간의 손톱자국',
    description: '난간에 누군가 손톱으로 새긴 눈금이 두 무리로 나뉘어 있다.',
    kind: 'puzzle',
    category: '관찰',
    puzzleText: '눈금은 네 개짜리 무리 하나와 두 개짜리 무리 하나로 나뉘어 있다.\n두 무리의 개수를 곱하면 얼마인가?',
    answer: '8',
    reward: '8 — 그날 밤 옥상에는 유민서를 포함해 총 두 사람이 있었다는 뜻이다. 8은 그중 한 사람의 반 번호였다.',
  },
}
