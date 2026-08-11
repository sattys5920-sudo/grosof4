import './ProfileScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS, TEAM_LABEL } from '../data/characters'
import { isRevealedTo } from '../data/reveal'
import { Badge } from '../components/Badge'

export function ProfileScreen() {
  const { viewerId, setViewerId, gmReveal, setGmReveal } = useGame()
  const viewer = CHARACTERS.find((c) => c.id === viewerId)!

  return (
    <div className="profile">
      <div className="profile__card">
        <div className="profile__card-head">
          <Badge team={viewer.team} size={56} />
          <div>
            <span className="profile__name">{viewer.name}</span>
            <span className={`profile__role profile__role--${viewer.team}`}>
              {TEAM_LABEL[viewer.team]} · {viewer.role}
            </span>
          </div>
        </div>
        <p className="profile__tagline">{viewer.tagline}</p>
        <dl className="profile__facts">
          <dt>사건 당시</dt>
          <dd>{viewer.incidentPosition}</dd>
          <dt>서사</dt>
          <dd>{viewer.bio}</dd>
          <dt>단서 특기</dt>
          <dd>{viewer.clueHint}</dd>
        </dl>
      </div>

      <div className="profile__section">
        <span className="profile__section-label">함께 갇힌 10명</span>
        <div className="profile__roster">
          {CHARACTERS.map((c) => {
            const revealed = isRevealedTo(viewer, c, gmReveal)
            return (
              <div key={c.id} className="profile__roster-item">
                <Badge team={c.team} size={26} revealed={revealed} />
                <div className="profile__roster-info">
                  <span className="profile__roster-name">{c.name}</span>
                  <span className="profile__roster-role">
                    {revealed ? `${TEAM_LABEL[c.team]} · ${c.role}` : '정체 미상'}
                  </span>
                </div>
                {c.id === viewerId && <span className="profile__me-tag">나</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="profile__dev">
        <span className="profile__section-label">프로토타입 도구</span>
        <label className="profile__dev-row">
          <span>시점 전환 (관전용 캐릭터 선택)</span>
          <select value={viewerId} onChange={(e) => setViewerId(e.target.value)}>
            {CHARACTERS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="profile__dev-row">
          <span>전체 정체 보기 (GM 모드)</span>
          <input
            type="checkbox"
            checked={gmReveal}
            onChange={(e) => setGmReveal(e.target.checked)}
          />
        </label>
      </div>
    </div>
  )
}
