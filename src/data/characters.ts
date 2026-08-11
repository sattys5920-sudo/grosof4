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
    role: '탐구자',
    grade: '3학년',
    tagline: '유민서와 함께 괴담을 조사하러 다니던 부원',
    incidentPosition: '실종 전날까지 유민서와 함께 학교 괴담을 취재했다',
    bio: '유민서와 짝을 지어 학교 곳곳의 괴담을 조사하러 다녔다. 실종 전날에도 함께 옥상 괴담에 대해 이야기했는데, 정작 그날 밤엔 같이 있어주지 못했다.',
    clueHint: '유민서와 함께 정리하던 괴담 조사 노트를 갖고 있다.',
    avatarSeed: 'seojun',
    revealText:
      '너는 {name}. 유민서와 짝을 지어 학교 괴담을 조사하러 다니던 동아리 부원이다. 실종 전날에도 함께였는데, 정작 그날 밤엔 곁에 있어주지 못했다. 오늘 밤, 그때 놓친 것이 무엇인지 알아내야 한다.',
  },
  {
    id: 'jimin',
    name: '플레이어 2',
    team: 'ward',
    role: '탐구자',
    grade: '2학년',
    tagline: '동아리 활동 기록을 정리하던 서기',
    incidentPosition: '실종 당일, 그날의 활동 계획을 서기 수첩에 기록해두었다',
    bio: '동아리 서기로서 매 활동을 꼼꼼히 기록해왔다. 유민서가 실종된 날의 계획표에는 "옥상 단독 조사"라고 적혀 있었는데, 왜 혼자 가야 했는지는 끝내 알아내지 못했다.',
    clueHint: '실종 당일 동아리 활동 계획이 적힌 서기 수첩을 갖고 있다.',
    avatarSeed: 'jimin',
    revealText:
      '너는 {name}. 동아리 활동을 꼼꼼히 기록해온 서기다. 유민서가 실종된 날의 계획표엔 "옥상 단독 조사"라고 적혀 있었다. 왜 혼자였는지, 오늘 밤 알아내야 한다.',
  },
  {
    id: 'dain',
    name: '플레이어 3',
    team: 'ward',
    role: '탐구자',
    grade: '3학년',
    tagline: '실종 당일 마지막 문자를 받은 절친',
    incidentPosition: '그날 밤 유민서에게서 마지막 메시지를 받았다',
    bio: '"미안해, 나 먼저 갈게." 그날 밤 마지막으로 온 문자였다. 무슨 뜻이냐고 되묻기도 전에 연락이 끊겼다. 3년째 그 문장의 의미를 곱씹고 있다.',
    clueHint: '당시 문자 캡처와 통화 기록의 시간대를 정확히 기억한다.',
    avatarSeed: 'dain',
    revealText:
      '너는 {name}. 실종 당일 밤, 유민서에게서 마지막 문자를 받은 절친이다. "미안해, 나 먼저 갈게." 그 말을 3년째 곱씹고 있다.',
  },
  {
    id: 'taehyun',
    name: '플레이어 4',
    team: 'ward',
    role: '탐구자',
    grade: '교사',
    tagline: '동아리를 지도했던 고문 교사',
    incidentPosition: '그날 밤 순찰 담당이었으나 옥상 쪽은 확인하지 못했다',
    bio: '괴담연구회 고문으로 활동을 승인하고 지도해왔다. 순찰 일지에 "이상 없음"이라 적었던 그 밤을 후회한다. 학생 혼자 밤늦게 옥상 조사를 나가도록 방치한 책임을 아직 정리하지 못했다.',
    clueHint: '학교 측이 폐기하려 했던 당시 동아리 활동 승인서와 순찰 일지에 접근할 수 있다.',
    avatarSeed: 'taehyun',
    revealText:
      '너는 {name}. 괴담연구회 고문 교사다. 순찰 일지에 "이상 없음"이라 적었던 그 밤을 후회한다. 학생을 혼자 보낸 그 밤을, 오늘 다시 마주해야 한다.',
  },
  {
    id: 'ayoung',
    name: '플레이어 5',
    team: 'ward',
    role: '탐구자',
    grade: '2학년',
    tagline: '동아리 사진·자료 담당 부원',
    incidentPosition: '실종 전 마지막으로 촬영된 유민서의 사진을 갖고 있다',
    bio: '동아리 활동 사진을 도맡아 찍어왔다. 실종 며칠 전, 유민서가 평소와 다르게 불안해 보이는 모습을 카메라에 담았던 게 계속 마음에 걸린다.',
    clueHint: '실종 직전 촬영된 사진 원본 파일을 아직 갖고 있다.',
    avatarSeed: 'ayoung',
    revealText:
      '너는 {name}. 동아리 사진·자료를 담당해온 부원이다. 실종 며칠 전, 유민서가 평소와 다르게 불안해 보였던 걸 사진으로 남겼다. 그 표정이 무슨 의미였는지 이제라도 알아야 한다.',
  },
  {
    id: 'seungwoo',
    name: '플레이어 6',
    team: 'ward',
    role: '탐구자',
    grade: '3학년',
    tagline: '녹음·촬영 장비를 담당하던 부원',
    incidentPosition: '실종 당일, 유민서가 빌려 간 녹음기가 아직 돌아오지 않았다',
    bio: '동아리 장비 담당으로, 실종 당일 유민서가 "혼자 확인할 게 있다"며 녹음기를 빌려 갔다. 그 녹음기는 끝내 돌아오지 않았다. 지금 흘러나오는 안내 방송의 잡음이 그 녹음기와 닮았다는 걸 눈치챈 유일한 사람.',
    clueHint: '동아리 장비 대여 기록과 장비의 고유한 잡음 패턴을 알고 있다.',
    avatarSeed: 'seungwoo',
    revealText:
      '너는 {name}. 동아리 장비를 담당하던 부원이다. 실종 당일 유민서가 빌려 간 녹음기는 끝내 돌아오지 않았다. 지금 방송에 섞인 잡음이 그 녹음기와 닮았다는 걸 눈치챈 건 너뿐이다.',
  },
  {
    id: 'haneul',
    name: '플레이어 7',
    team: 'sin',
    role: '방관자',
    grade: '1학년',
    tagline: '실종 당일 밤, 옥상 근처에서 무언가를 봤지만 도망쳤다',
    incidentPosition: '유민서가 마지막으로 목격된 옥상 근처에 있었다',
    bio: '그날 밤 옥상에서 유민서가 무언가에게 이끌리듯 사라지는 걸 봤다. 무서워서 그대로 도망쳤고, 3년간 아무것도 못 봤다고 스스로를 속여왔다. 오늘 밤, 그 침묵이 형체를 갖고 되돌아왔다.',
    clueHint: '자신에 대한 목격담이 나오면 화제를 돌리려 한다.',
    avatarSeed: 'haneul',
    revealText:
      '너는 {name}. 그날 밤 옥상 근처, 기억이 이상하게 뭉개져 있다. 분명 무언가를 봤던 것 같은데... 왜 도망쳤는지, 무엇을 봤는지는 잘 기억나지 않는다. 다만 오늘 밤, 그 침묵이 무언가로 돌아왔다는 예감이 든다.',
  },
  {
    id: 'gihoon',
    name: '플레이어 8',
    team: 'sin',
    role: '거짓유포자',
    grade: '2학년',
    tagline: '실종 직후, 동아리 SNS에 자극적인 괴담을 지어 올렸다',
    incidentPosition: '유민서 실종 직후, 동아리 계정으로 괴담을 각색해 퍼뜨렸다',
    bio: '"사실 회장이 진짜 괴물을 만났다더라" — 동아리 팔로워를 늘리려고 지어낸 이야기였다. 그 말이 학교에 쌓인 소문과 뒤섞여 진짜 무언가를 불러들였다는 걸 아직 받아들이지 못했다.',
    clueHint: '괴담이 처음 퍼진 동아리 계정 게시물의 작성 시각을 지울 수 있다.',
    avatarSeed: 'gihoon',
    revealText:
      '너는 {name}. 실종 직후 동아리 팔로워를 위해 자극적인 괴담을 지어 퍼뜨렸던 장본인이다. 그저 관심이 필요했을 뿐인데... 그 말이 진짜가 됐다는 소문이 있다. 기억이 자꾸 흐려진다.',
  },
  {
    id: 'eunchae',
    name: '플레이어 9',
    team: 'sin',
    role: '배신자',
    grade: '3학년',
    tagline: '가장 적극적으로 "진실을 밝히자"고 외치는 사람',
    incidentPosition: '차기 회장 자리를 두고 유민서와 경쟁하고 있었다',
    bio: '동아리 차기 회장 자리를 두고 유민서와 경쟁하다 밀려났다. 실종 전날, "옥상에 가면 확실한 증거를 찾을 수 있을 거야"라며 유민서를 혼자 그곳으로 이끈 게 자신이었다. 완벽하게 은폐에 성공해 다른 누구도, 심지어 같은 편인 두 괴이조차 정체를 모른다.',
    clueHint: '자신에게 불리한 단서가 나오면 누구보다 빠르게 다른 용의자를 지목한다.',
    avatarSeed: 'eunchae',
    revealText:
      '너는 {name}. 3년 전 그날 밤의 기억이 유독 조각나 있다. 차기 회장 자리를 걸고 유민서와 경쟁했다는 감각만 남아 있을 뿐, 정확히 무슨 일이 있었는지는 잘 기억나지 않는다. 오늘 밤, 남들보다 먼저 "진실을 밝히자"고 외치고 싶어진다. 이유는 모르겠지만.',
  },
  {
    id: 'eunho',
    name: '플레이어 10',
    team: 'veil',
    role: '경계인',
    grade: '1학년',
    tagline: '신입 부원으로 위장해 잠입한 유민서의 오빠',
    incidentPosition: '사건 당시엔 이 학교 학생이 아니었다',
    bio: '동생 유민서가 사라진 뒤 학교의 자퇴 처리 통보서 한 장만 받았다. 동아리 안에 진실을 아는 누군가가 있다고 확신하고, 신입 부원으로 위장해 잠입했다.',
    clueHint: '다른 누구도 눈치채지 못한 유민서 개인 소지품의 흔적을 알아볼 수 있다.',
    avatarSeed: 'eunho',
    revealText:
      '너는 {name}. 실종된 유민서의 오빠이며, 신입 부원으로 위장해 동아리에 잠입했다. 동아리 안에 진실을 아는 사람이 있다고 확신한다. 승패보다 중요한 건 단 하나 — 동생의 진짜 행방을 찾는 것이다.',
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
  ward: '탐구자',
  sin: '괴이',
  veil: '경계인',
}

export function roleLabel(c: Character): string {
  const team = TEAM_LABEL[c.team]
  return team === c.role ? team : `${team} · ${c.role}`
}

export function personalize(text: string, name: string): string {
  return text.replaceAll('{name}', name)
}
