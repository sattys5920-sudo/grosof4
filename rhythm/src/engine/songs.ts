// 기본 수록곡 목록. 파일은 public/songs/에 그대로 들어 있어서(서버 업로드
// 없이 정적으로 배포됨) 빌드 시 그대로 복사되고, 클라이언트는 fetch로
// 받아와 다른 파일과 똑같은 분석 파이프라인을 탄다.
//
// 각 스테이지는 멤버 이름으로 표시하고(예: "하니 스테이지"), 실제 곡
// 정보는 song 필드에 남겨서 나중에 참고할 수 있게 한다.
export interface BuiltinSong {
  id: string
  title: string
  song: string
  file: string
}

export const BUILTIN_SONGS: BuiltinSong[] = [
  { id: 'hani', title: '하니 스테이지', song: 'PiKi - Kawaii Kaiwai (かわいいかいわい)', file: 'piki-kawaii-kaiwai.mp3' },
  { id: 'minji', title: '민지 스테이지', song: 'Mrs. GREEN APPLE - 青と夏', file: 'mrs-green-apple-track.mp3' },
  { id: 'eina', title: '에이나 스테이지', song: 'Vampire Weekend - A-Punk', file: 'vampire-weekend-a-punk.mp3' },
  { id: 'james', title: '제임스 스테이지', song: 'Billie Eilish - bad guy', file: 'billie-eilish-bad-guy.mp3' },
  { id: 'taesan', title: '태산 스테이지', song: 'Jamiroquai - Virtual Insanity', file: 'jamiroquai-virtual-insanity.mp3' },
  { id: 'sebi', title: '세비 스테이지', song: 'SOJU GANG, MATI - Goodbye (Radio Edit)', file: 'soju-gang-mati-goodbye.mp3' },
  { id: 'ian', title: '이안 스테이지', song: 'Men I Trust - Tailwhip', file: 'men-i-trust-tailwhip.mp3' },
  { id: 'winter', title: '윈터 스테이지', song: 'Kool & The Gang - Get Down On It', file: 'get-down-on-it.mp3' },
  { id: 'kangmin', title: '강민 스테이지', song: '잘 부탁드립니다', file: 'jal-butakdeurimnida.mp3' },
  { id: 'geonho', title: '건호 스테이지', song: 'Tom Misch - It Runs Through Me (feat. De La Soul)', file: 'tom-misch-it-runs-through-me.mp3' },
  { id: 'haerin', title: '해린 스테이지', song: 'Capsule - Sugarless GiRL', file: 'sugarless-girl.mp3' },
]
