import './ClassroomScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS } from '../data/characters'
import { isRevealedTo } from '../data/reveal'
import { Badge } from '../components/Badge'

export function ClassroomScreen() {
  const { viewerId, gmReveal, classroom, joinInvestigation, attemptDuel, displayName } = useGame()
  const viewer = CHARACTERS.find((c) => c.id === viewerId)!

  if (classroom.status === 'locked') {
    return (
      <div className="classroom classroom--locked">
        <span className="classroom__lock-icon">▧</span>
        <p className="classroom__lock-text">
          교실은 잠겨 있다. 전체 조사가 시작되면 알림이 울릴 것이다.
        </p>
      </div>
    )
  }

  const event = classroom.event!
  const isDuel = event.kind === 'duel'
  const joined = classroom.participants.includes(viewerId)

  return (
    <div className="classroom">
      <div className="classroom__banner">
        <span className="classroom__banner-label">
          {classroom.status === 'cleared' ? '조사 완료' : '전체 조사 진행 중'}
        </span>
        <h2>{event.title}</h2>
        <p>{event.description}</p>
      </div>

      {!isDuel && (
        <div className="classroom__panel">
          <span className="classroom__section-label">
            참여 인원 ({classroom.participants.length}/{event.needed})
          </span>
          <div className="classroom__participants">
            {classroom.participants.length === 0 && (
              <span className="classroom__empty">아직 아무도 나서지 않았다</span>
            )}
            {classroom.participants.map((id) => {
              const c = CHARACTERS.find((ch) => ch.id === id)!
              return (
                <div key={id} className="classroom__participant">
                  <Badge team={c.team} size={20} revealed={isRevealedTo(viewer, c, gmReveal)} />
                  <span>{displayName(id)}</span>
                </div>
              )
            })}
          </div>

          {classroom.status === 'active' && !joined && (
            <button className="classroom__cta" onClick={joinInvestigation}>
              함께 조사하기
            </button>
          )}
          {classroom.status === 'active' && joined && (
            <p className="classroom__waiting">더 많은 인원을 기다리는 중...</p>
          )}
        </div>
      )}

      {isDuel && classroom.status === 'active' && (
        <div className="classroom__panel">
          <p className="classroom__waiting">괴이가 손을 내밀며 묻는다 — 홀일까, 짝일까?</p>
          <div className="classroom__duel-row">
            <button className="classroom__cta" onClick={() => attemptDuel('odd')}>
              홀
            </button>
            <button className="classroom__cta" onClick={() => attemptDuel('even')}>
              짝
            </button>
          </div>
          {classroom.note && <p className="classroom__waiting">{classroom.note}</p>}
        </div>
      )}

      {classroom.status === 'cleared' && classroom.hint && (
        <div className="classroom__hint">
          <span className="classroom__section-label">전원에게 공개된 단서</span>
          <p>{classroom.hint}</p>
        </div>
      )}

      {classroom.status === 'cleared' && (
        <p className="classroom__waiting">GM이 새로운 조사를 열 때까지 기다려야 한다.</p>
      )}
    </div>
  )
}
