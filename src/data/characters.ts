import type { Character, Room } from './types'

export const MISSING_STUDENT = '한소율'
export const INCIDENT_YEARS_AGO = 3

export const CHARACTERS: Character[] = [
  {
    id: 'seojun',
    name: '한서준',
    team: 'ward',
    role: '탐구자',
    tagline: '실종 학생과 같은 반이었던 반장',
    incidentPosition: '사건 당일, 종례 직후 교실에 남아 있었다',
    bio: '한소율과 3년 내내 같은 반이었다. 그날도 평소처럼 인사를 나눴을 뿐인데, 다음 날부터 그 자리는 비어 있었다. 학교의 공식 발표를 한 번도 믿은 적이 없다.',
    clueHint: '졸업앨범과 출석부의 미세한 날짜 불일치를 알아챌 수 있다.',
    avatarSeed: '한서준',
    revealText:
      '너는 한서준. 한소율과 3년 내내 같은 반이었던 반장이다. 그날도 평소처럼 인사를 나눴을 뿐인데, 다음 날부터 그 자리는 비어 있었다. 오늘 밤, 무엇이 진실인지 알아내야 한다.',
  },
  {
    id: 'jimin',
    name: '오지민',
    team: 'ward',
    role: '탐구자',
    tagline: '3년째 사건을 파고든 신문부원',
    incidentPosition: '사건 당시 신입 부원으로 첫 취재를 준비하던 중이었다',
    bio: '학교 신문에 실리지 못한 기사 초안을 아직도 가지고 있다. "자퇴 처리"라는 공식 발표 뒤에 무언가 더 있다고 믿고 3년을 매달렸다.',
    clueHint: '외부에 유출되지 않은 취재 메모와 인터뷰 녹취를 갖고 있다.',
    avatarSeed: '오지민',
    revealText:
      '너는 오지민. 3년째 이 사건을 파고든 신문부원이다. 학교 신문에 실리지 못한 기사 초안을 아직도 가지고 있다. 오늘 밤, 마침내 진실에 닿을 수 있을지도 모른다.',
  },
  {
    id: 'dain',
    name: '최다인',
    team: 'ward',
    role: '탐구자',
    tagline: '실종 당일 마지막 문자를 받은 절친',
    incidentPosition: '그날 밤 소율에게서 마지막 메시지를 받았다',
    bio: '"미안해, 나 먼저 갈게"라는 문자를 마지막으로 연락이 끊겼다. 3년간 그 문장의 의미를 곱씹었지만 아직도 답을 찾지 못했다.',
    clueHint: '당시 문자 캡처와 통화 기록의 시간대를 정확히 기억한다.',
    avatarSeed: '최다인',
    revealText:
      '너는 최다인. 실종 당일 밤 한소율에게서 마지막 문자를 받은 사람이다. "미안해, 나 먼저 갈게." 그 말의 의미를 3년째 곱씹고 있다.',
  },
  {
    id: 'taehyun',
    name: '강태현',
    team: 'ward',
    role: '탐구자',
    tagline: '사건 당일 야간자율학습 감독 교사',
    incidentPosition: '그날 밤 순찰 담당이었으나 옥상 쪽은 확인하지 못했다',
    bio: '순찰 일지에 "이상 없음"이라 적었던 그 밤을 후회한다. 학교 측의 조용한 은폐에 가담하도록 강요받았던 사실을 아무에게도 말하지 못했다.',
    clueHint: '학교 측이 폐기하려 했던 당시 순찰 일지 원본에 접근할 수 있다.',
    avatarSeed: '강태현',
    revealText:
      '너는 강태현. 사건 당일 야간자율학습 감독 교사였다. 순찰 일지에 "이상 없음"이라 적었던 그 밤을 후회한다. 오늘 밤, 그 후회를 갚을 시간이다.',
  },
  {
    id: 'ayoung',
    name: '윤아영',
    team: 'ward',
    role: '탐구자',
    tagline: '보건실을 지키던 보건부장',
    incidentPosition: '사건 당일 오후, 보건실에서 소율을 마지막으로 진료했다',
    bio: '그날 오후 소율이 보건실에 찾아와 "아무도 못 믿겠다"고 말했던 걸 기억한다. 무슨 뜻이냐고 묻지 못한 것이 3년째 마음에 걸린다.',
    clueHint: '폐기되지 않은 당일 보건실 방문 기록부를 열람할 수 있다.',
    avatarSeed: '윤아영',
    revealText:
      '너는 윤아영. 보건부장으로, 사건 당일 오후 한소율을 마지막으로 진료했다. "아무도 못 믿겠다"던 그 말이 무슨 뜻인지 묻지 못한 채 3년이 지났다.',
  },
  {
    id: 'seungwoo',
    name: '백승우',
    team: 'ward',
    role: '탐구자',
    tagline: '방송 장비를 가장 잘 아는 방송부장',
    incidentPosition: '사건 당일 저녁 방송 사고가 났을 때 당직이었다',
    bio: '그날 저녁 정체불명의 잡음이 스피커를 타고 퍼졌던 걸 직접 겪었다. 지금 흘러나오는 안내 방송의 목소리가 그때와 똑같다는 걸 눈치챈 유일한 사람.',
    clueHint: '방송 장비의 배선과 송출 기록을 분석해 방송의 출처를 좁힐 수 있다.',
    avatarSeed: '백승우',
    revealText:
      '너는 백승우. 방송부장으로, 사건 당일 저녁 방송 사고를 직접 겪었다. 지금 흘러나오는 안내 방송의 목소리가 그때와 똑같다는 걸 눈치챈 유일한 사람이다.',
  },
  {
    id: 'haneul',
    name: '정하늘',
    team: 'sin',
    role: '방관자',
    tagline: '그날, 현장 근처에서 못 본 척 지나쳤다',
    incidentPosition: '실종 현장 근처에 있었지만 자리를 피했다',
    bio: '그날 밤 무언가를 보았다. 하지만 휘말리기 싫어서 조용히 돌아섰다. 3년간 아무 일도 없었다고 스스로를 설득해 왔지만, 오늘 밤 그 침묵이 형체를 갖고 되돌아왔다.',
    clueHint: '자신에 대한 목격담이 나오면 화제를 돌리려 한다.',
    avatarSeed: '정하늘',
    revealText:
      '너는 정하늘. 그날 밤의 기억이 이상하게 뭉개져 있다. 분명 그 근처에 있었던 것 같은데... 무엇을 보았는지, 왜 자리를 피했는지는 잘 기억나지 않는다. 다만 오늘 밤, 그 침묵이 무언가로 돌아왔다는 예감이 든다.',
  },
  {
    id: 'gihoon',
    name: '남기훈',
    team: 'sin',
    role: '거짓유포자',
    tagline: '재미로 지어낸 괴담이 진짜가 됐다',
    incidentPosition: '사건 직후, 익명 계정으로 괴담을 처음 퍼뜨렸다',
    bio: '"사실 걔 괴물 됐대"라는 농담 한 줄이 이렇게까지 퍼질 줄 몰랐다. 그저 관심이 필요했을 뿐인데, 그 농담이 지금 학교를 뒤덮은 안개의 매개가 됐다는 걸 아직 받아들이지 못했다.',
    clueHint: '괴담이 처음 퍼진 익명 게시물의 작성 시각을 지울 수 있다.',
    avatarSeed: '남기훈',
    revealText:
      '너는 남기훈. 그날 이후 인터넷에 떠돈 괴담 중 하나가 유독 익숙하게 느껴진다. 혹시 내가 쓴 글이었나? 확실하지 않다. 그저 재미였을 뿐인데... 기억이 자꾸 흐려진다.',
  },
  {
    id: 'eunchae',
    name: '유은채',
    team: 'sin',
    role: '배신자',
    tagline: '가장 적극적으로 "진실을 밝히자"고 외치는 사람',
    incidentPosition: '공식적으로는 사건과 무관한 것으로 알려져 있다',
    bio: '3년 전, 소율을 벼랑 끝까지 몰아넣은 장본인. 완벽하게 은폐에 성공해 다른 누구도, 심지어 같은 편인 두 괴이조차 정체를 모른다. 오늘 밤도 가장 먼저 조사실로 달려가 "단서를 찾자"고 외칠 것이다.',
    clueHint: '자신에게 불리한 단서가 나오면 누구보다 빠르게 다른 용의자를 지목한다.',
    avatarSeed: '유은채',
    revealText:
      '너는 유은채. 3년 전 그날 밤의 기억이 유독 조각나 있다. 무언가 했다는 감각만 남아 있을 뿐, 정확히 무슨 일이 있었는지는 잘 기억나지 않는다. 오늘 밤, 남들보다 먼저 "진실을 밝히자"고 외치고 싶어진다. 이유는 모르겠지만.',
  },
  {
    id: 'eunho',
    name: '차은호',
    team: 'veil',
    role: '경계인',
    tagline: '전학생으로 위장해 잠입한 한소율의 오빠',
    incidentPosition: '사건 당시엔 이 학교 학생이 아니었다',
    bio: '동생 한소율이 사라진 뒤 학교의 자퇴 처리 통보서 한 장만 받았다. 진실을 밝히기 위해 신분을 숨기고 전학생으로 들어왔다. 승패보다 중요한 건 오직 하나 — 소율의 진짜 행방을 찾는 것.',
    clueHint: '다른 누구도 눈치채지 못한 한소율 개인 소지품의 흔적을 알아볼 수 있다.',
    avatarSeed: '차은호',
    revealText:
      '너는 차은호. 실종된 한소율의 오빠이며, 전학생으로 위장해 잠입했다. 승패보다 중요한 건 단 하나 — 동생의 진짜 행방을 찾는 것이다.',
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
    description: '한소율이 마지막으로 목격된 장소. 안개는 이곳에서 가장 짙다.',
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
