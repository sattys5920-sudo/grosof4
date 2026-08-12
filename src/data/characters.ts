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
    personalStory:
      '몇 년째 매 활동마다 출석을 체크해왔는지 스스로도 헷갈린다. 그런데 최근 출석부를 다시 넘겨보다가 이상한 걸 발견했다 — 유민서라는 이름이 해마다 다른 필체로, 그러나 매번 새로 등록된 것처럼 적혀 있었다. 마치 매년 새로 입부한 사람인 것처럼....... 역대 출석부 원본을 전부 갖고 있어서, 연도별로 비교해 보면 뭔가 나올지도 모른다.',
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
    personalStory:
      '누가 진실을 숨기고 있는지 알아내려 조용히 관찰해왔다. 그런데 이상하게도, 자신이 이 동아리에 들어온 첫날의 기억이 도무지 떠오르지 않는다. 다른 부원들에게 물어봐도 다들 애매하게 웃을 뿐이다....... 그동안 부원들의 행동을 정리해 온 자신만의 기록이 있다.',
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
    personalStory:
      '"미안해, 나 먼저 갈게." 그 마지막 문자를 아직도 외우고 있다. 그런데 그게 정확히 며칠 전이었는지 헤아려보면 도무지 앞뒤가 맞지 않는다....... 마치 아주 오래전 일처럼 아득한데, 어제 일처럼 생생하다. 그날의 문자 캡처와 통화 기록을 아직도 갖고 있다 — 다만 저장된 날짜가 이상하다.',
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
    personalStory:
      '순찰 일지에 "이상 없음"이라 적었던 그 밤을 후회한다. 다만 그 밤이 정확히 언제였는지는, 이상하게도 해마다 다시 어제처럼 떠오른다. 이제는 무엇이든 놓치지 않으려 CCTV를 뒤진다....... 학교 곳곳의 CCTV 접근 권한을 갖고 있고, 오래된 테이프도 보관하고 있다.',
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
    personalStory:
      '특별한 능력은 없지만, 마지막 순간까지 함께하겠다고 다짐했다. 카메라 롤을 정리하다 보면 이상하게도 매번 같은 얼굴들이, 같은 자리에서, 조금씩 다른 계절 옷을 입고 찍혀 있다....... 실종 직전 촬영된 사진 원본 파일을 아직 갖고 있다.',
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
    personalStory:
      '동아리 차기 회장 자리를 두고 유민서와 경쟁하다 밀려났다. 그런데 그날 이후로 이상한 밤들이 이어졌다 — 잠들 무렵이면 복도 끝이나 옥상 계단참에 유민서가 서 있는 게 보였고, 눈을 마주칠 때마다 알 수 없는 죄책감이 목을 조여왔다. 정작 그녀에게 무슨 짓을 했는지는 하나도 기억나지 않는데, 그 죄책감만은 해가 갈수록 짙어진다....... 자신에게 불리한 단서가 나오면 누구보다 빠르게 다른 용의자를 지목하게 된다.',
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
    personalStory:
      '어느 밤 옥상 근처를 지나다가 그곳에 서 있는 유민서를 봤다. 말을 걸어야 하나 망설이다 결국 무서워서 도망쳤다. 그런데 그다음 날부터 이상한 일들이 하나둘 생기기 시작했고, 정확히 기억나지 않는 누군가에게서 "본 걸 아무한테도 말하지 말라"는 부탁 아닌 부탁을 받았다. 그 대가로 무언가를 받았다는 감각만 남아 있을 뿐, 정확히 무엇을 봤는지도, 무엇을 받았는지도 이제는 흐릿하다....... 자신에 대한 목격담이 나오면 자꾸 화제를 돌리게 된다.',
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
    personalStory:
      '겉으로는 순진한 신입처럼 굴지만, 사실은 처음부터 목적을 갖고 동아리에 들어왔다. 괴담을 지어 퍼뜨린 것도 의심을 피하기 위한 위장이었다 — 그런데 "신입"이라는 말이 무색하게, 정작 얼마나 오래 이 동아리에 있었는지는 스스로도 확신할 수 없다....... 괴담이 처음 퍼진 동아리 계정 게시물의 작성 시각을 지울 수 있다.',
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
    personalStory:
      '그날 밤의 기억이 유독 조각나 있다. 무언가 했다는 감각만 남아 있을 뿐, 자신이 학생인지 괴이인지조차, 심지어 자신이 언제부터 이 동아리에 있었는지조차 확신할 수 없다....... 자신의 기억을 스스로도 믿지 못한다.',
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
    personalStory:
      '사촌 동생 유민서가 사라진 뒤 학교의 자퇴 처리 통보서 한 장만 받았다. 성이 다른 외사촌이라 아무도 둘의 관계를 눈치채지 못했다. 그렇게 오랜 시간이 지나도록 진실은 밝혀지지 않았고, 결국 신입 부원으로 위장해 이 동아리에 잠입했다. 다만 요즘 들어 이상한 확신이 든다 — 사촌 동생을 이대로 놓아주면, 정말로 모든 게 끝나버릴 것 같다는 확신이. 그래서는 안 된다....... 다른 누구도 눈치채지 못한 유민서 개인 소지품의 흔적을 알아볼 수 있다.',
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
