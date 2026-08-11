import type { EventLibraryItem } from './types'
import { MISSING_STUDENT } from './characters'

export const EVENT_LIBRARY: EventLibraryItem[] = [
  {
    id: 'duel-oddeven',
    category: '대결',
    dispatchKind: 'duel',
    title: '괴이와의 홀짝 대결',
    description: '괴이가 손을 내밀며 홀짝을 묻는다. 맞히면 무언가 알려주겠다고 속삭인다. (실제 플레이 가능)',
    reward: '괴이가 마지못해 옥상 열쇠의 위치를 흘린다.',
    implemented: true,
  },
  {
    id: 'duel-truthgame',
    category: '대결',
    dispatchKind: 'duel',
    title: '세 개의 거짓말',
    description: '괴이가 진위를 알 수 없는 문장 세 개를 던지고 하나만 고르라 한다. (추후 구현 예정)',
    implemented: false,
  },
  {
    id: 'popup-blackout',
    category: '공포연출',
    dispatchKind: 'popup',
    title: '정전과 속삭임',
    description: '짧은 정전과 함께 스피커에서 속삭임이 들린다는 긴급 알림을 전원에게 보낸다.',
    popupKind: 'sin',
    popupBody:
      '방금 전 짧은 정전이 있었다. 그 순간 스피커 너머로 무언가 속삭이는 소리를 들은 사람이 여럿이다.',
    implemented: true,
  },
  {
    id: 'popup-cctv',
    category: '공포연출',
    dispatchKind: 'popup',
    title: 'CCTV에 잡힌 형체',
    description: '복도 CCTV에 정체불명의 형체가 잡혔다는 공지를 즉시 보낸다.',
    popupKind: 'sin',
    popupBody: '방금 2 층 복도 CCTV에 정체를 알 수 없는 형체가 잡혔다. 문단속을 확인하라.',
    implemented: true,
  },
  {
    id: 'popup-attendance',
    category: '공포연출',
    dispatchKind: 'popup',
    title: '사라진 이름',
    description: '출석부에서 이상한 흔적이 발견됐다는 알림을 보낸다.',
    popupKind: 'event',
    popupBody: `방금 출석부를 확인한 관리자가 이상한 점을 발견했다. ${MISSING_STUDENT} 옆 칸, 원래 없던 이름 하나가 지워진 흔적이 있다.`,
    implemented: true,
  },
]
