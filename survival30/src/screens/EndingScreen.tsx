import { endingText } from '../engine/endings'
import { LOCATION_ORDER } from '../engine/locations'
import type { GameState } from '../engine/types'

export default function EndingScreen({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const ending = state.ending ? endingText(state.ending) : { title: '끝', description: '' }
  const day = state.gameOverDay ?? state.day
  const survivors = state.survivors.filter((s) => s.alive).length
  const highlights = state.eventLog.filter((e) => e.tag === 'event').slice(-5)

  return (
    <div className="ending">
      <div className="ending-card">
        <div className="ending-eyebrow">{day}일째</div>
        <h1 className="ending-title">{ending.title}</h1>
        <p className="ending-desc">{ending.description}</p>

        <div className="ending-stats">
          <div>
            <span className="k">생존 일수</span>
            <span className="v">{day}</span>
          </div>
          <div>
            <span className="k">체력</span>
            <span className="v">{state.stats.hp}</span>
          </div>
          <div>
            <span className="k">정신력</span>
            <span className="v">{state.stats.mental}</span>
          </div>
          <div>
            <span className="k">물</span>
            <span className="v">{state.stats.water}</span>
          </div>
          <div>
            <span className="k">식량</span>
            <span className="v">{state.stats.food}</span>
          </div>
          <div>
            <span className="k">동료</span>
            <span className="v">{survivors}명</span>
          </div>
          <div>
            <span className="k">정보</span>
            <span className="v">{state.stats.info}%</span>
          </div>
          <div>
            <span className="k">탐색 장소</span>
            <span className="v">
              {state.exploredLocations.length} / {LOCATION_ORDER.length}
            </span>
          </div>
        </div>

        {highlights.length > 0 && (
          <div className="ending-log">
            <div className="ending-log-title">당신의 생존 기록</div>
            <ul>
              {highlights.map((h, i) => (
                <li key={i}>
                  <span className="log-day">D{h.day}</span> {h.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button className="btn btn-primary" onClick={onRestart}>
          다시 살아남기
        </button>
      </div>
    </div>
  )
}
