import type { Character, Room } from './types'

export const SCHOOL_NAME = '고운고등학교'
export const CLUB_NAME = '괴담연구회'
export const MISSING_STUDENT = '유민서'
export const INCIDENT_YEARS_AGO = 3
export const INCIDENT_SUMMARY =
  '3년 전, 괴담연구회 회장이었던 유민서는 학교에 얽힌 괴담을 직접 조사하겠다며 밤늦게 홀로 옥상에 남았다가 실종되었다. 학교는 "가출 후 자퇴 처리"로 조용히 사건을 덮었다.'

export const CHARACTERS: Character[] = [
  {
    id: 'seojun',
    name: '플레이어 1',
    team: 'ward',
    role: '기록자',
    grade: '3학년',
    tagline: '동아리 출석부를 관리했던 총무',
    incidentPosition: '실종 당일 출석부에 유민서의 이름이 이상하게 기록되어 있었다',
    bio: '매 활동마다 출석을 체크해왔다. 그런데 유민서가 실종된 다음 날 출석부를 다시 보니, 분명 있었던 이름이 다른 필체로 다시 쓰여 있었다. 누군가 손을 댄 흔적이다.',
    clueHint: '실종 전후 출석부 원본과 사본을 비교할 수 있다.',
    avatarSeed: 'seojun',
    abilityName: '출석부',
    abilityDescription:
      '능력을 사용하면 무작위로 두 부원의 정보를 보게 된다. 단, 둘 중 하나는 사실이고 하나는 거짓이다 — 어느 쪽이 거짓인지는 알 수 없다.',
    revealText:
      '너는 {name}. 동아리 출석부를 관리해온 총무다. 유민서가 사라진 다음 날, 출석부의 필체가 미묘하게 달라져 있었다. 누군가 손을 댄 흔적이다. 조사실에서 단서를 확보하면 《출석부》 능력을 쓸 수 있게 된다.',
  },
  {
    id: 'jimin',
    name: '플레이어 2',
    team: 'ward',
    role: '감찰자',
    grade: '2학년',
    tagline: '동아리 부원들의 행동을 은밀히 살펴온 부원',
    incidentPosition: '실종 전부터 몇몇 부원의 수상한 행동을 눈여겨봤다',
    bio: '누가 진실을 숨기고 있는지 알아내려 조용히 관찰해왔다. 하지만 그 눈썰미를 정작 실종 사건에는 쓰지 못했다는 게 마음에 걸린다.',
    clueHint: '부원들의 그 시절 행동 패턴을 정리한 자기만의 기록이 있다.',
    avatarSeed: 'jimin',
    abilityName: '학생부 조사',
    abilityDescription:
      '한 명을 지목하면, 그 사람이 원정에서 실패 카드를 낼 수 있는 사람인지 아닌지를 알 수 있다.',
    revealText:
      '너는 {name}. 부원들의 행동을 은밀히 관찰해온 감찰자다. 조사실에서 단서를 확보하면, 《학생부 조사》로 누가 원정에서 실패 카드를 낼 수 있는 사람인지 알아낼 수 있게 된다.',
  },
  {
    id: 'dain',
    name: '플레이어 3',
    team: 'ward',
    role: '보호자',
    grade: '3학년',
    tagline: '실종 당일 마지막 문자를 받은 절친',
    incidentPosition: '그날 밤 유민서에게서 마지막 메시지를 받았다',
    bio: '"미안해, 나 먼저 갈게." 그 말을 들어주지 못한 걸 후회하며, 이제는 누구든 다시 혼자 두지 않겠다고 다짐했다.',
    clueHint: '당시 문자 캡처와 통화 기록의 시간대를 정확히 기억한다.',
    avatarSeed: 'dain',
    abilityName: '동행',
    abilityDescription:
      '게임 전체에서 단 한 번, 한 명을 지정해 보호할 수 있다. 보호받는 동안 그 사람에 대한 정체 확인 능력은 모두 "판별 불가"로 나온다.',
    revealText:
      '너는 {name}. 실종 당일 밤 유민서에게서 마지막 문자를 받은 절친이다. 그때 곁에 있어주지 못한 후회로, 이제는 누군가를 끝까지 지키기로 했다. 조사실에서 단서를 확보하면 《동행》 능력을 쓸 수 있게 된다.',
  },
  {
    id: 'taehyun',
    name: '플레이어 4',
    team: 'ward',
    role: '목격자',
    grade: '교사',
    tagline: '동아리를 지도했던 고문 교사',
    incidentPosition: '그날 밤 순찰 담당이었으나 옥상 쪽은 확인하지 못했다',
    bio: '순찰 일지에 "이상 없음"이라 적었던 그 밤을 후회한다. 이제는 무엇이든 놓치지 않으려 한다.',
    clueHint: '학교 곳곳의 CCTV 접근 권한을 갖고 있다.',
    avatarSeed: 'taehyun',
    abilityName: 'CCTV',
    abilityDescription:
      '이미 끝난 원정 하나를 지정하면, 그 원정에서 실패 카드가 몇 장 나왔는지 알 수 있다. 누가 냈는지는 알 수 없다.',
    revealText:
      '너는 {name}. 괴담연구회 고문 교사다. 조사실에서 단서를 확보하면, 학교 CCTV 접근 권한으로 《CCTV》 능력을 써서 지난 원정의 실패 카드 수를 확인할 수 있게 된다.',
  },
  {
    id: 'ayoung',
    name: '플레이어 5',
    team: 'ward',
    role: '일반학생',
    grade: '2학년',
    tagline: '동아리 사진·자료 담당 부원',
    incidentPosition: '실종 전 마지막으로 촬영된 유민서의 사진을 갖고 있다',
    bio: '특별한 능력은 없지만, 마지막 순간까지 함께하겠다고 다짐했다.',
    clueHint: '실종 직전 촬영된 사진 원본 파일을 아직 갖고 있다.',
    avatarSeed: 'ayoung',
    abilityName: '생존자',
    abilityDescription:
      '특별한 능력은 없다. 대신 마지막 5차 원정에 반드시 참가해야 하며, 그러지 못하면 선이 승리해도 개인적으로는 패배한다.',
    revealText:
      '너는 {name}. 동아리 사진·자료를 담당해온 부원이다. 특별한 능력은 없지만, 무슨 일이 있어도 마지막 원정까지는 함께해야 한다는 예감이 든다.',
  },
  {
    id: 'seungwoo',
    name: '플레이어 6',
    team: 'sin',
    role: '괴이의 사도',
    grade: '3학년',
    tagline: '가장 적극적으로 "진실을 밝히자"고 외치는 사람',
    incidentPosition: '차기 회장 자리를 두고 유민서와 경쟁하고 있었다',
    bio: '동아리 차기 회장 자리를 두고 유민서와 경쟁하다 밀려났다. 실종 전날, "옥상에 가면 확실한 증거를 찾을 수 있을 거야"라며 유민서를 혼자 그곳으로 이끈 게 자신이었다. 완벽하게 은폐에 성공해 다른 누구도 정체를 모른다.',
    clueHint: '자신에게 불리한 단서가 나오면 누구보다 빠르게 다른 용의자를 지목한다.',
    avatarSeed: 'seungwoo',
    abilityName: '침식',
    abilityDescription: '게임 시작 시 선 진영 한 명을 몰래 지정한다. 그 사람은 자신이 지정된 사실을 모른다.',
    revealText:
      '너는 {name}. 3년 전 그날 밤, 차기 회장 자리를 걸고 유민서와 경쟁하다 밀려났다. 실종 전날 유민서를 옥상으로 이끈 건 바로 너다. 조사실에서 단서를 확보하면 《침식》으로 선 진영 한 명을 몰래 표적으로 삼을 수 있게 된다.',
  },
  {
    id: 'haneul',
    name: '플레이어 7',
    team: 'sin',
    role: '공범',
    grade: '1학년',
    tagline: '실종 당일 밤, 옥상 근처에서 무언가를 봤지만 도망쳤다',
    incidentPosition: '유민서가 마지막으로 목격된 옥상 근처에 있었다',
    bio: '그날 밤 옥상에서 무언가를 봤다. 무서워서 도망쳤지만, 사실은 그 이상을 알고 있었다. 침묵의 대가로 무언가를 받았다는 사실은 아무에게도 말하지 않았다.',
    clueHint: '자신에 대한 목격담이 나오면 화제를 돌리려 한다.',
    avatarSeed: 'haneul',
    abilityName: '위조',
    abilityDescription:
      '게임 전체에서 단 한 번, 자신이 참가한 원정이 "성공"으로 끝났을 때 그 결과를 "실패"로 바꿀 수 있다.',
    revealText:
      '너는 {name}. 그날 밤 옥상 근처에서 무언가를 봤지만 도망쳤다. 그 침묵의 대가로 무언가를 받았다. 조사실에서 단서를 확보하면 《위조》 능력을 쓸 수 있게 된다.',
  },
  {
    id: 'gihoon',
    name: '플레이어 8',
    team: 'sin',
    role: '잠입자',
    grade: '2학년',
    tagline: '실종 직후, 동아리 SNS에 자극적인 괴담을 지어 올렸다',
    incidentPosition: '유민서 실종 직후, 동아리 계정으로 괴담을 각색해 퍼뜨렸다',
    bio: '겉으로는 순진한 신입처럼 굴지만, 사실은 처음부터 목적을 갖고 동아리에 들어왔다. 괴담을 지어 퍼뜨린 것도 의심을 피하기 위한 위장이었다.',
    clueHint: '괴담이 처음 퍼진 동아리 계정 게시물의 작성 시각을 지울 수 있다.',
    avatarSeed: 'gihoon',
    abilityName: '위장',
    abilityDescription:
      '처음으로 누군가 너의 정체를 확인하면, 그 결과는 반드시 "선"으로 나온다. 두 번째 확인부터는 진짜 정체가 드러난다.',
    revealText:
      '너는 {name}. 순진한 신입처럼 굴지만 처음부터 목적을 갖고 동아리에 들어왔다. 누군가 처음 네 정체를 확인하면 《위장》으로 완벽하게 선을 연기할 수 있다.',
  },
  {
    id: 'eunchae',
    name: '플레이어 9',
    team: 'veil',
    role: '망각자',
    grade: '3학년',
    tagline: '자신이 어느 편인지 스스로도 모른다',
    incidentPosition: '그날 밤의 기억이 유독 조각나 있다',
    bio: '3년 전 그날 밤의 기억이 유독 조각나 있다. 무언가 했다는 감각만 남아 있을 뿐, 자신이 선인지 악인지조차 확신할 수 없다.',
    clueHint: '자신의 기억을 스스로도 믿지 못한다.',
    avatarSeed: 'eunchae',
    abilityName: '기억 회복',
    abilityDescription:
      '3차 원정이 끝나면, 지금까지 자신이 참가한 원정 중 실패한 원정이 1회 이하면 "선", 2회 이상이면 "악"으로 정체가 확정된다. 그전까지는 자신의 정체를 아무도, 심지어 자기 자신도 모른다.',
    revealText:
      '너는 {name}. 3년 전 그날 밤의 기억이 유독 조각나 있다. 지금은 네가 선인지 악인지조차 알 수 없다. 3차 원정이 끝나면 지금까지의 원정 결과에 따라 《기억 회복》이 일어나 정체가 저절로 밝혀질 것이다.',
  },
  {
    id: 'eunho',
    name: '플레이어 10',
    team: 'veil',
    role: '복수자',
    grade: '1학년',
    tagline: '신입 부원으로 위장해 잠입한 유민서의 오빠',
    incidentPosition: '사건 당시엔 이 학교 학생이 아니었다',
    bio: '동생 유민서가 사라진 뒤 학교의 자퇴 처리 통보서 한 장만 받았다. 동아리 안에 진실을 아는 누군가가 있다고 확신하고, 신입 부원으로 위장해 잠입했다. 진영의 승패보다 중요한 건 단 하나 — 진짜 원흉을 찾아내는 것.',
    clueHint: '다른 누구도 눈치채지 못한 유민서 개인 소지품의 흔적을 알아볼 수 있다.',
    avatarSeed: 'eunho',
    abilityName: '공략',
    abilityDescription:
      '게임 전체에서 단 한 번, 한 명을 지목해 진짜 정체를 확인할 수 있다. 단, 지목당한 사람은 다음 날 "누군가 나의 정체를 확인했다"는 사실을 알게 된다.',
    revealText:
      '너는 {name}. 실종된 유민서의 오빠이며, 신입 부원으로 위장해 잠입했다. 조사실에서 단서를 확보하면 《공략》으로 단 한 번, 누군가의 진짜 정체를 확인할 수 있게 된다.',
  },
]

export const ROOMS: Room[] = [
  {
    id: 'library',
    name: '도서관',
    capacity: 3,
    description: '옛날 신문 스크랩과 졸업앨범 속에서 3년 전 그 시절의 단서를 찾는다.',
  },
  {
    id: 'infirmary',
    name: '보건실',
    capacity: 2,
    description: '실종 당일 진료 기록과 보건교사의 목격담이 남아 있는 곳.',
  },
  {
    id: 'broadcast',
    name: '방송실',
    capacity: 3,
    description: '그날의 방송 사고 기록, 그리고 지금 흘러나오는 방송의 출처를 추적한다.',
  },
  {
    id: 'rooftop',
    name: '옥상',
    capacity: 2,
    description: '유민서가 마지막으로 목격된 장소. 안개는 이곳에서 가장 짙다.',
  },
]

export const TEAM_LABEL: Record<Character['team'], string> = {
  ward: '선',
  sin: '악',
  veil: '독립',
}

export function roleLabel(c: Character): string {
  return `${TEAM_LABEL[c.team]} · ${c.role}`
}

export function personalize(text: string, name: string): string {
  return text.replaceAll('{name}', name)
}
