import type { Character, Room } from './types'

export const SCHOOL_NAME = '고운고등학교'
export const CLUB_NAME = '괴담연구회'
export const MISSING_STUDENT = '유민서'
export const INCIDENT_WEEKS_AGO = 3
export const INCIDENT_SUMMARY =
  '몇 주 전, 괴담연구회 회장이었던 유민서는 학교에 얽힌 괴담을 직접 조사하겠다며 밤늦게 홀로 옥상에 남았다가 실종되었다. 학교는 "가출 후 자퇴 처리"로 조용히 사건을 덮었다.'

const COMMON_REVEAL_TEXT =
  '너는 {name}. 왜 이 늦은 시간까지 학교에 있는 건지 기억나지 않는다. 같은 동아리라고 하는 이 사람들도 모두 낯설기만 하다. 하지만 단 하나, 우리 모두가 유민서를 찾기 위해 이곳에 모였다는 사실만은 분명하다. 그 사실 하나만이 우리를 이 공간에 붙잡아 두고 있다.'

export const CHARACTERS: Character[] = [
  {
    id: 'seojun',
    name: '플레이어 1',
    team: 'ward',
    role: '기록자',
    avatarSeed: 'seojun',
    perceivedYear: 2021,
    abilityName: '출석부',
    abilityDescription:
      '언제든지 발동할 수 있고, 자신이 직접 지목한 부원 2 명에 대한 정보(진영 혹은 역할 중 하나)를 받는다. 다만 두 정보 중 하나는 반드시 진실이고 다른 하나는 반드시 거짓으로 섞여서 나오며, 어느 쪽이 거짓인지는 알려 주지 않는다. 즉 출석부는 확답이 아니라 교차 검증이 필요한 단서일 뿐이다. 대상은 직접 고를 수 있으며, 자기 자신은 대상에서 제외된다.',
    revealText: COMMON_REVEAL_TEXT,
  },
  {
    id: 'jimin',
    name: '플레이어 2',
    team: 'ward',
    role: '감찰자',
    avatarSeed: 'jimin',
    perceivedYear: 2023,
    abilityName: '학생부 조사',
    abilityDescription:
      '언제든지 불가에게 개인적으로 요청해 부원 1 명을 지목할 수 있고, 불가는 그 사람이 원정에서 실패 카드를 낼 수 있는 사람인지 아닌지를 "예" 또는 "아니오"로만 알려 준다. 세부 진영이나 역할까지는 알 수 없으며, 오직 실패 카드 사용 가능 여부만 확인된다. 같은 사람을 두 번 지목할 수도 있지만 그럴 경우 새로운 정보는 얻을 수 없다. 자기 자신은 지목할 수 없다.',
    revealText: COMMON_REVEAL_TEXT,
  },
  {
    id: 'dain',
    name: '플레이어 3',
    team: 'ward',
    role: '보호자',
    avatarSeed: 'dain',
    perceivedYear: 2019,
    abilityName: '수호',
    abilityDescription:
      '언제든지 발동할 수 있다. 발동 직후 진행되는 원정 하나를 대상으로, 그 원정에서 실제로 제출된 실패 카드 중 1 장을 무효화한다. 예를 들어 실패 카드가 1 장뿐이었다면 그 원정은 성공으로 처리되고, 4 차 원정처럼 실패 카드가 2 장 이상 필요한 경우에도 1 장이 사라진 것으로 계산된다. 다만 실패 카드가 애초에 2 장 이상 제출된 원정에서는 여전히 실패를 막지 못할 수 있다.',
    revealText: COMMON_REVEAL_TEXT,
  },
  {
    id: 'taehyun',
    name: '플레이어 4',
    team: 'ward',
    role: '목격자',
    avatarSeed: 'taehyun',
    perceivedYear: 2017,
    abilityName: 'CCTV',
    abilityDescription:
      '이미 결과가 나온 원정 하나를 지정할 수 있다. 그 원정에서 실제로 제출된 실패 카드가 몇 장이었는지 정확한 숫자로 알려 주지만, 그 카드를 누가 냈는지는 알려 주지 않는다. 아직 진행되지 않았거나 현재 진행 중인 원정은 지정할 수 없다. 같은 원정을 두 번 지정해도 이미 확인한 것과 같은 결과만 돌아온다.',
    revealText: COMMON_REVEAL_TEXT,
  },
  {
    id: 'ayoung',
    name: '플레이어 5',
    team: 'ward',
    role: '일반학생',
    avatarSeed: 'ayoung',
    perceivedYear: 2026,
    abilityName: '매듭짓기',
    abilityDescription: '따로 발동하는 능력은 없다. 다만 무언가 해야 한다는 느낌이 강하게 든다.',
    revealText: COMMON_REVEAL_TEXT,
  },
  {
    id: 'seungwoo',
    name: '플레이어 6',
    team: 'sin',
    role: '괴이의 사도',
    avatarSeed: 'seungwoo',
    perceivedYear: 2018,
    abilityName: '분별',
    abilityDescription:
      '한 명을 지목해 그 사람의 능력과 현재까지의 발동 전적을 확인할 수 있다. 하루에 1 회씩만 사용이 가능하며, 자기 자신을 지목할 수 없다.',
    revealText: COMMON_REVEAL_TEXT,
  },
  {
    id: 'haneul',
    name: '플레이어 7',
    team: 'sin',
    role: '파괴자',
    avatarSeed: 'haneul',
    perceivedYear: 2020,
    abilityName: '파괴',
    abilityDescription:
      '자신이 팀원으로 참가한 원정의 결과가 카드 집계상 "성공"으로 확정된 직후, 능력을 발동해 그 결과를 "실패"로 바꿔치기할 수 있다. 이미 "실패"로 끝난 원정에는 사용할 수 없고, 자신이 참가하지 않은 원정에도 사용할 수 없다. 사용 즉시 그 사실은 진영과 무관하게 아무에게도 공개되지 않는다.',
    revealText: COMMON_REVEAL_TEXT,
  },
  {
    id: 'gihoon',
    name: '플레이어 8',
    team: 'sin',
    role: '잠입자',
    avatarSeed: 'gihoon',
    perceivedYear: 2022,
    abilityName: '위장',
    abilityDescription:
      '언제든지 직접 발동할 수 있다. 위장을 걸어 둔 상태에서 누군가 자신의 정체를 확인하는 능력을 사용하면, 그 결과는 실제 진영과 무관하게 무조건 "학생"으로만 나온다.',
    revealText: COMMON_REVEAL_TEXT,
  },
  {
    id: 'eunchae',
    name: '플레이어 9',
    team: 'veil',
    role: '망각자',
    avatarSeed: 'eunchae',
    perceivedYear: 2025,
    abilityName: '기억 회복',
    abilityDescription:
      '게임이 시작될 때 당신의 진영은 정해지지 않은 채로 남아 있다. 3 차 원정의 결과가 확정되는 순간, 지금까지 참가한 원정 중 실패로 끝난 원정이 1 회 이하면 정체가 "학생"으로, 2 회 이상이면 "괴이"로 자동 확정된다. 확정 이전까지는 어떤 정체 확인 능력을 받아도 "판별 불가"로만 나오며, 본인조차 스스로의 진영을 알 수 없다. 확정된 이후에는 되돌릴 수 없다.',
    revealText: COMMON_REVEAL_TEXT,
  },
  {
    id: 'eunho',
    name: '플레이어 10',
    team: 'veil',
    role: '복수자',
    avatarSeed: 'eunho',
    perceivedYear: 2016,
    abilityName: '투시',
    abilityDescription:
      '언제든지 게임 전체에서 단 1 회, 부원 1 명을 지목해 진짜 진영과 역할을 정확하게 확인할 수 있다. 지목당한 사람은 다음 날 "누군가 나의 정체를 확인했다"는 사실만을 통보받으며, 누가 확인했는지는 알 수 없다. 자기 자신은 지목할 수 없다.',
    revealText: COMMON_REVEAL_TEXT,
  },
]

export const ROOMS: Room[] = [
  {
    id: 'library',
    name: '도서관',
    capacity: 3,
    description: '옛날 신문 스크랩과 졸업앨범 속에서 그 시절의 단서를 찾는다.',
    ambientText: '도서관은 고요하다....... 서가 사이로 낡은 종이 냄새만 떠돈다. 아직 아무것도 열리지 않았다.',
  },
  {
    id: 'infirmary',
    name: '보건실',
    capacity: 2,
    description: '그날의 진료 기록과 보건교사의 목격담이 남아 있는 곳.',
    ambientText: '보건실은 조용하다....... 소독약 냄새가 옅게 남아 있고, 커튼이 미세하게 흔들린다. 아직 아무것도 열리지 않았다.',
  },
  {
    id: 'broadcast',
    name: '방송실',
    capacity: 3,
    description: '그날의 방송 사고 기록, 그리고 지금 흘러나오는 방송의 출처를 추적한다.',
    ambientText: '방송실은 고요하다....... 스피커에서는 낮은 잡음만 흘러나온다. 아직 아무것도 열리지 않았다.',
  },
  {
    id: 'rooftop',
    name: '옥상',
    capacity: 2,
    description: '유민서가 마지막으로 목격된 장소. 안개는 이곳에서 가장 짙다.',
    ambientText: '옥상은 고요하다....... 안개가 유독 짙게 깔려 있어 난간 너머는 아무것도 보이지 않는다. 아직 아무것도 열리지 않았다.',
  },
]

export const TEAM_LABEL: Record<Character['team'], string> = {
  ward: '학생',
  sin: '괴이',
  veil: '독립',
}

export function roleLabel(c: Character): string {
  return `${TEAM_LABEL[c.team]} · ${c.role}`
}

export function personalize(text: string, name: string): string {
  return text.replaceAll('{name}', name)
}

// 능력별 최대 사용 횟수. 목록에 없는 역할(잠입자 제외 상시/자동형)은 능력 사용 버튼 자체가 없다.
export const ABILITY_MAX_USES: Partial<Record<Character['role'], number>> = {
  기록자: 2,
  감찰자: 2,
  보호자: 2,
  목격자: 5,
  '괴이의 사도': 3,
  파괴자: 1,
  잠입자: 2,
  복수자: 1,
}
