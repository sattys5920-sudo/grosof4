import './StoryIntroScreen.css'
import { INCIDENT_SUMMARY, SCHOOL_NAME, CLUB_NAME } from '../data/characters'

export function StoryIntroScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="intro">
      <div className="intro__body">
        <span className="intro__eyebrow">{SCHOOL_NAME} · {CLUB_NAME}</span>
        <p>
          지방의 오래된 사립고등학교. {CLUB_NAME} 부원 열 명이 이유 없이 학교에 남아 자정을
          넘긴다.
        </p>
        <p className="intro__incident">{INCIDENT_SUMMARY}</p>
        <p>
          자정을 넘긴 순간, 방송실 스피커에서 정체불명의 안내 방송이 흘러나오고 학교 전체가 짙은
          안개에 둘러싸인다. 정문도, 후문도, 창밖도 전부 안개뿐이다.
        </p>
        <p className="intro__quote">
          [교내 방송] 세 사람은... 이미 그날의 죄를... 되갚고 있다. 나머지는 오늘 밤, 그들을
          찾아내거나... 함께 잠식된다.
        </p>
      </div>
      <button className="intro__enter" onClick={onEnter}>
        학교 가기
      </button>
    </div>
  )
}
