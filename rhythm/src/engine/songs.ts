// 기본 수록곡 목록. 파일은 public/songs/에 그대로 들어 있어서(서버 업로드
// 없이 정적으로 배포됨) 빌드 시 그대로 복사되고, 클라이언트는 fetch로
// 받아와 다른 파일과 똑같은 분석 파이프라인을 탄다.
export interface BuiltinSong {
  id: string
  title: string
  file: string
}

export const BUILTIN_SONGS: BuiltinSong[] = [
  { id: 'a-punk', title: 'Vampire Weekend - A-Punk', file: 'vampire-weekend-a-punk.mp3' },
  { id: 'get-down-on-it', title: 'Kool & The Gang - Get Down On It', file: 'get-down-on-it.mp3' },
  { id: 'sugarless-girl', title: 'Sugarless GiRL', file: 'sugarless-girl.mp3' },
  { id: 'it-runs-through-me', title: 'Tom Misch - It Runs Through Me (feat. De La Soul)', file: 'tom-misch-it-runs-through-me.mp3' },
  { id: 'mystery-1', title: '수록곡 (제목 확인 필요)', file: 'mystery-track-1.mp3' },
  { id: 'tailwhip', title: 'Men I Trust - Tailwhip', file: 'men-i-trust-tailwhip.mp3' },
  { id: 'mrs-green-apple', title: 'Mrs. Green Apple (제목 확인 필요)', file: 'mrs-green-apple-track.mp3' },
  { id: 'virtual-insanity', title: 'Jamiroquai - Virtual Insanity', file: 'jamiroquai-virtual-insanity.mp3' },
  { id: 'bad-guy', title: 'Billie Eilish - bad guy', file: 'billie-eilish-bad-guy.mp3' },
  { id: 'goodbye-radio-edit', title: 'SOJU GANG, MATI - Goodbye (Radio Edit)', file: 'soju-gang-mati-goodbye.mp3' },
  { id: 'kawaii-kaiwai', title: 'PiKi - Kawaii Kaiwai', file: 'piki-kawaii-kaiwai.mp3' },
]
