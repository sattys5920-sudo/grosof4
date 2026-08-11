import type { Character, Room } from './types'

export const MISSING_STUDENT = '유민서'
export const INCIDENT_YEARS_AGO = 3
export const INCIDENT_SUMMARY =
  '3년 전, 방송부 학생 유민서는 전국 학생 방송경연 예선 자료를 유출했다는 누명을 쓰고 정학 처분을 앞둔 채 실종되었다. 학교는 "자퇴 처리"로 조용히 사건을 덮었지만, 진짜 유출자는 따로 있었다.'

export const CHARACTERS: Character[] = [
  {
    id: 'seojun',
    name: '플레이어 1',
    team: 'ward',
    role: '탐구자',
    grade: '3학년',
    tagline: '유민서의 정학 처분 학급회의를 진행해야 했던 반장',
    incidentPosition: '사건 당일, 학급회의에서 유민서의 정학 안건을 발표했다',
    bio: '방송경연 자료 유출 사건 직후, 반장으로서 유민서의 정학 처분을 학급에 공지해야 했다. 그때는 증거가 명백하다고 믿었다. 유민서의 표정이 억울해 보였다는 게 자꾸 마음에 걸렸는데, 다음 날부터 그 자리는 비어 있었다.',
    clueHint: '학급회의 당시 배포된 증거 자료 사본을 아직 갖고 있다.',
    avatarSeed: 'seojun',
    revealText:
      '너는 {name}. 3년 전, 학급 반장으로서 유민서의 정학 처분을 학급에 공지해야 했다. 그때는 증거가 명백하다고 믿었다. 하지만 유민서의 표정이 자꾸 떠오른다. 오늘 밤, 그날 놓친 것이 무엇인지 알아내야 한다.',
  },
  {
    id: 'jimin',
    name: '플레이어 2',
    team: 'ward',
    role: '탐구자',
    grade: '2학년',
    tagline: '자료 유출의 진짜 경로를 의심했던 신문부원',
    incidentPosition: '사건 직후, 유출 경로를 취재하려다 학교 측의 제지를 받았다',
    bio: '방송경연 자료가 어떻게 유출됐는지 취재하려 했지만, 학교 측이 "이미 종결된 사안"이라며 취재를 막았다. 그날 이후 유출 경로에 관한 자료를 조용히 모아왔다.',
    clueHint: '학교 측이 회수하려 했던 취재 메모와 서버 접속 기록 사본을 갖고 있다.',
    avatarSeed: 'jimin',
    revealText:
      '너는 {name}. 방송경연 자료 유출 사건의 진짜 경로를 파헤치려던 신문부원이다. 학교는 취재를 막았지만, 3년간 몰래 자료를 모아왔다. 오늘 밤, 마침내 그 진실에 닿을 수 있을지도 모른다.',
  },
  {
    id: 'dain',
    name: '플레이어 3',
    team: 'ward',
    role: '탐구자',
    grade: '3학년',
    tagline: '실종 당일 마지막 문자를 받은 절친',
    incidentPosition: '정학 처분이 확정된 그날 밤, 유민서에게서 마지막 메시지를 받았다',
    bio: '"미안해, 나 먼저 갈게." 정학이 확정된 그날 밤 마지막으로 온 문자였다. 억울하다는 말을 믿어줬어야 했는데, 그때는 자료가 너무 명백해 보였다. 3년째 그 문장의 의미를 곱씹고 있다.',
    clueHint: '당시 문자 캡처와 통화 기록의 시간대를 정확히 기억한다.',
    avatarSeed: 'dain',
    revealText:
      '너는 {name}. 정학이 확정된 그날 밤, 유민서에게서 마지막 문자를 받은 절친이다. "미안해, 나 먼저 갈게." 그 말을 믿어주지 못했던 걸 3년째 후회하고 있다.',
  },
  {
    id: 'taehyun',
    name: '플레이어 4',
    team: 'ward',
    role: '탐구자',
    grade: '교사',
    tagline: '정학 징계위원회에 참석했던 야간자율학습 감독 교사',
    incidentPosition: '그날 밤 순찰 담당이었으나, 옥상 쪽은 확인하지 못했다',
    bio: '징계위원회에서 유민서에게 불리한 증거를 검토했던 교사 중 한 명이다. 순찰 일지에 "이상 없음"이라 적었던 그 밤을 후회한다. 그 증거가 조작됐을지도 모른다는 의심은 그때 하지 못했다.',
    clueHint: '학교 측이 폐기하려 했던 징계위원회 회의록 원본에 접근할 수 있다.',
    avatarSeed: 'taehyun',
    revealText:
      '너는 {name}. 유민서의 징계위원회에 참석했던 교사다. 순찰 일지에 "이상 없음"이라 적었던 그 밤을 후회한다. 그 증거가 정말 명백했는지, 오늘 밤 다시 확인해야 한다.',
  },
  {
    id: 'ayoung',
    name: '플레이어 5',
    team: 'ward',
    role: '탐구자',
    grade: '2학년',
    tagline: '징계위 직전 유민서를 마지막으로 돌봤던 보건부장',
    incidentPosition: '정학 처분 발표 직전 오후, 보건실에서 유민서를 진료했다',
    bio: '징계위원회가 열리기 직전, 유민서가 보건실에 찾아와 "나 진짜 안 그랬는데 아무도 안 믿어줘"라고 말했던 걸 기억한다. 그 말을 흘려들었던 게 3년째 마음에 걸린다.',
    clueHint: '폐기되지 않은 당일 보건실 방문 기록부를 열람할 수 있다.',
    avatarSeed: 'ayoung',
    revealText:
      '너는 {name}. 징계위 직전 유민서를 마지막으로 돌본 보건부장이다. "나 진짜 안 그랬는데 아무도 안 믿어줘." 그 말을 흘려들었던 걸 3년째 후회한다.',
  },
  {
    id: 'seungwoo',
    name: '플레이어 6',
    team: 'ward',
    role: '탐구자',
    grade: '3학년',
    tagline: '유민서와 함께 방송부에서 활동했던 방송부장',
    incidentPosition: '자료 유출 사건 당일, 함께 방송부 활동을 하던 동료였다',
    bio: '유민서와 함께 방송경연을 준비하던 동료였다. 유출 사건이 터졌을 때 진짜 범인이 따로 있다는 걸 어렴풋이 느꼈지만, 증거가 없어 나서지 못했다. 지금 흘러나오는 안내 방송의 목소리가 그때 방송부 장비와 똑같다는 걸 눈치챈 유일한 사람.',
    clueHint: '방송 장비의 배선과 송출 기록을 분석해 방송의 출처를 좁힐 수 있다.',
    avatarSeed: 'seungwoo',
    revealText:
      '너는 {name}. 유민서와 함께 방송경연을 준비하던 방송부장이다. 진짜 범인이 따로 있다고 어렴풋이 느꼈지만 나서지 못했다. 지금 흘러나오는 방송이 그때와 같은 장비에서 나온다는 걸 눈치챈 건 너뿐이다.',
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
    tagline: '실종 직후, 재미로 괴담을 지어 SNS에 퍼뜨렸다',
    incidentPosition: '유민서 실종 직후, 익명 계정으로 괴담을 처음 퍼뜨렸다',
    bio: '"사실 걔 원래 좀 이상했잖아, 괴물 됐다던데" — 그냥 관심이 필요해서 지어낸 말이었다. 그 농담이 학교에 쌓인 악의와 뒤섞여 진짜 무언가를 불러들였다는 걸 아직 받아들이지 못했다.',
    clueHint: '괴담이 처음 퍼진 익명 게시물의 작성 시각을 지울 수 있다.',
    avatarSeed: 'gihoon',
    revealText:
      '너는 {name}. 실종 직후 재미로 괴담을 지어 퍼뜨렸던 장본인이다. 그저 관심이 필요했을 뿐인데... 그 말이 진짜가 됐다는 소문이 있다. 기억이 자꾸 흐려진다.',
  },
  {
    id: 'eunchae',
    name: '플레이어 9',
    team: 'sin',
    role: '배신자',
    grade: '3학년',
    tagline: '가장 적극적으로 "진실을 밝히자"고 외치는 사람',
    incidentPosition: '방송경연 최종 후보 경쟁에서 유민서에게 밀렸다',
    bio: '방송경연 최종 후보 자리를 두고 유민서와 경쟁하다 밀려났다. 실제로 자료를 유출한 건 자신이었지만, 그 증거가 유민서 것처럼 보이도록 조작해 뒤집어씌웠다. 완벽하게 은폐에 성공해 다른 누구도, 심지어 같은 편인 두 괴이조차 정체를 모른다.',
    clueHint: '자신에게 불리한 단서가 나오면 누구보다 빠르게 다른 용의자를 지목한다.',
    avatarSeed: 'eunchae',
    revealText:
      '너는 {name}. 3년 전 그날 밤의 기억이 유독 조각나 있다. 방송경연 최종 후보 자리를 걸고 유민서와 경쟁했다는 감각만 남아 있을 뿐, 정확히 무슨 일이 있었는지는 잘 기억나지 않는다. 오늘 밤, 남들보다 먼저 "진실을 밝히자"고 외치고 싶어진다. 이유는 모르겠지만.',
  },
  {
    id: 'eunho',
    name: '플레이어 10',
    team: 'veil',
    role: '경계인',
    grade: '1학년',
    tagline: '전학생으로 위장해 잠입한 유민서의 오빠',
    incidentPosition: '사건 당시엔 이 학교 학생이 아니었다',
    bio: '동생 유민서가 사라진 뒤 학교의 자퇴 처리 통보서 한 장만 받았다. 자료 유출 누명이 조작됐다는 걸 직감했지만 증거가 없었다. 진실을 밝히기 위해 신분을 숨기고 전학생으로 들어왔다.',
    clueHint: '다른 누구도 눈치채지 못한 유민서 개인 소지품의 흔적을 알아볼 수 있다.',
    avatarSeed: 'eunho',
    revealText:
      '너는 {name}. 실종된 유민서의 오빠이며, 전학생으로 위장해 잠입했다. 동생이 누명을 썼다는 걸 직감했지만 증거가 없었다. 승패보다 중요한 건 단 하나 — 동생의 진짜 행방을 찾는 것이다.',
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
