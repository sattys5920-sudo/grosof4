import { useState, type ReactNode } from 'react'
import './HallClueArt.css'
import { useGame } from '../state/GameContext'
import type { HallClueKind } from '../data/types'
import { PixelIcon } from './PixelIcon'

// 2018년/2026년으로 착각하는 캐릭터 슬롯 — characters.ts의 perceivedYear 기준.
const YEAR_2018_CHAR_ID = 'seungwoo'
const YEAR_2026_CHAR_ID = 'ayoung'

const NAPOLITAN_ITEMS = [
  '아침 조회는 8 시 30 분에 시작한다.',
  '급식실은 2 층에 있다.',
  '도서관은 매주 월요일에 휴관한다.',
  '교복 셔츠는 흰색이어야 한다.',
  '동아리실은 3 층 복도 끝에 있다.',
  '야간 자율학습은 10 시에 끝난다.',
  '체육복은 하복과 동복으로 나뉜다.',
  '매점은 쉬는 시간에만 연다.',
  '교문은 오후 9 시에 닫힌다.',
  '신입 부원은 매년 한 명씩 받는다.',
  '괴담연구회의 열한 번째 부원은 없습니다.',
  '사물함은 학년이 바뀌면 새로 배정된다.',
  '졸업 앨범은 2 월에 나눠준다.',
  '운동장 조회는 매주 월요일에 한다.',
  '학교 축제는 10 월에 열린다.',
]

const PHOTO_NAMES_2018 = ['민기', '성준', '경태', '소희', '민주', '윤호', '성혜', '기찬', '서영', '병호']

function PixelPerson({ dim }: { dim?: boolean }) {
  return <PixelIcon name="person" size={22} color={dim ? 'var(--bone-dim)' : 'var(--bone-bright)'} />
}

let cachedVoices: SpeechSynthesisVoice[] = []
function pickKoreanVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) cachedVoices = voices
  const korean = cachedVoices.filter((v) => v.lang?.toLowerCase().startsWith('ko'))
  return korean[0] ?? cachedVoices[0] ?? null
}

function VoicePlayButton({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  function play() {
    if (!supported) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'ko-KR'
    utter.rate = 1
    const voice = pickKoreanVoice()
    if (voice) utter.voice = voice
    utter.onstart = () => setPlaying(true)
    utter.onend = () => setPlaying(false)
    utter.onerror = () => setPlaying(false)
    window.speechSynthesis.speak(utter)
  }

  if (!supported) return null

  return (
    <button className={`clueart__voice-btn ${playing ? 'is-playing' : ''}`} onClick={play}>
      <PixelIcon name="play" size={12} />
      {playing ? '재생 중......' : '음성으로 듣기'}
    </button>
  )
}

function ClueFrame({
  label,
  kind,
  children,
}: {
  label: string
  kind: HallClueKind
  children: ReactNode
}) {
  return (
    <div className={`clueart clueart--${kind}`}>
      <span className="clueart__label">{label}</span>
      <div className="clueart__paper">{children}</div>
    </div>
  )
}

export function HallClueArt({ kind }: { kind: HallClueKind }) {
  const { displayName } = useGame()
  const year2018Name = displayName(YEAR_2018_CHAR_ID)
  const year2026Name = displayName(YEAR_2026_CHAR_ID)

  switch (kind) {
    case 'napolitan':
      return (
        <ClueFrame label="어느 게시판에서 캡처한 글" kind={kind}>
          <ol className="clueart__list">
            {NAPOLITAN_ITEMS.map((item, i) => (
              <li key={i} className={i === 10 ? 'is-flagged' : ''}>
                <span className="clueart__list-num">{i + 1}.</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </ClueFrame>
      )

    case 'idcard':
      return (
        <ClueFrame label="누군가의 학생증" kind={kind}>
          <div className="clueart__idcard">
            <div className="clueart__idcard-photo">
              <span>기록 없음</span>
            </div>
            <div className="clueart__idcard-fields">
              <span className="clueart__idcard-school">고운고등학교 학생증</span>
              <span>
                <b>이름</b> 유민서
              </span>
              <span>
                <b>입학</b> 2016 년 3 월
              </span>
            </div>
          </div>
        </ClueFrame>
      )

    case 'book-wait':
      return (
        <ClueFrame label="낡은 책의 한 페이지" kind={kind}>
          <div className="clueart__book">
            <span className="clueart__book-title">《괴이에 관하여》</span>
            <p>
              괴이를 완전히 끊어내기 위해서는, 저주가 시작된 뒤로 정확히 10 년을 기다려야 한다. 그
              전에는 무엇을 해도 소용이 없다. 열 번째 해가 되어야만, 비로소 끊어낼 기회가 주어진다.
            </p>
          </div>
        </ClueFrame>
      )

    case 'newspaper':
      return (
        <ClueFrame label="누렇게 바랜 신문 조각" kind={kind}>
          <div className="clueart__newspaper">
            <span className="clueart__newspaper-mast">지역 소식</span>
            <span className="clueart__newspaper-headline">
              인근 폐가 탐방하려던 여고생, 귀갓길 뺑소니 사고로 실종
            </span>
            <p>
              지난달, 인근 흉가로 소문난 폐건물을 탐방하러 늦은 시각 홀로 향하던 유 모(당시 17)
              양이 귀가하던 중 뺑소니 사고를 당한 것으로 알려졌다. 경찰은 목격자와 차량을 찾고
              있으나 아직까지 단서를 확보하지 못했다.
            </p>
          </div>
        </ClueFrame>
      )

    case 'photo-2018-07': {
      const names = [...PHOTO_NAMES_2018, `${year2018Name} 영원하자!`]
      return (
        <ClueFrame label="2018 년 7 월, 동아리 단체 사진" kind={kind}>
          <div className="clueart__photo">
            <div className="clueart__photo-frame">
              {Array.from({ length: 11 }).map((_, i) => (
                <PixelPerson key={i} />
              ))}
            </div>
            <p className="clueart__photo-caption">{names.join(', ')}</p>
          </div>
        </ClueFrame>
      )
    }

    case 'chat-note':
      return (
        <ClueFrame label="누군가 주고받은 쪽지" kind={kind}>
          <div className="clueart__chat">
            <p className="clueart__chat-line is-a">혹시 우리 학교에 귀신 있다는 얘기 들었어?</p>
            <p className="clueart__chat-line is-b">어...... 나도 들었어. 매년 죽은 학생이 나타난다는 소문 있대.</p>
            <p className="clueart__chat-line is-a">진짜 무섭다....... ㅠㅠ</p>
          </div>
        </ClueFrame>
      )

    case 'intro-2026': {
      const introText = `안녕하세요! 11번째 부원으로 들어오게 된 ${year2026Name}입니다. 함께하게 돼서 너무 즐겁고 설레요. 같이 무서운 일들 많이 경험할 수 있으면 좋겠어요.`
      return (
        <ClueFrame label="동아리 가입 게시판 — 자기소개" kind={kind}>
          <div className="clueart__intro">
            <span className="clueart__intro-name">{year2026Name}</span>
            <p>
              안녕하세요~ 11 번째 부원으로 들어오게 된 <b>{year2026Name}</b>입니다! 함께하게 돼서
              너무 즐겁고 설레요. 같이 무서운 일들 많이 경험할 수 있으면 좋겠어요.
            </p>
            <VoicePlayButton text={introText} />
          </div>
        </ClueFrame>
      )
    }

    case 'book-escape':
      return (
        <ClueFrame label="낡은 책의 한 페이지" kind={kind}>
          <div className="clueart__book">
            <span className="clueart__book-title">《괴이에 관하여》</span>
            <p>
              이곳에서 벗어나려면, 이 공간에 깃든 괴이의 정체를 낱낱이 조사해 완전히 타파해야
              한다. 그것만이 유일한 길이다. 조사를 멈추는 순간, 이곳에 계속 붙잡히게 된다.
            </p>
          </div>
        </ClueFrame>
      )

    case 'photo-2018-08':
      return (
        <ClueFrame label="2018 년 8 월, 동아리 단체 사진" kind={kind}>
          <div className="clueart__photo">
            <div className="clueart__photo-frame">
              {Array.from({ length: 10 }).map((_, i) => (
                <PixelPerson key={i} />
              ))}
            </div>
            <p className="clueart__photo-caption">{PHOTO_NAMES_2018.join(', ')}</p>
          </div>
        </ClueFrame>
      )

    case 'escape-note':
      return (
        <ClueFrame label="벽에 남겨진 메모" kind={kind}>
          <p className="clueart__scrawl">이곳에서 탈출하고 괴이를 끊어라!</p>
        </ClueFrame>
      )

    default:
      return null
  }
}
