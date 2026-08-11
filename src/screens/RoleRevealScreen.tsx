import './RoleRevealScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS, roleLabel, personalize } from '../data/characters'
import { Badge } from '../components/Badge'

export function RoleRevealScreen() {
  const { viewerId, nickname, acknowledgeRole } = useGame()
  const viewer = CHARACTERS.find((c) => c.id === viewerId)!

  return (
    <div className="reveal">
      <span className="reveal__eyebrow">{nickname}, 안개가 당신을 삼키기 전에</span>
      <Badge team={viewer.team} size={64} />
      <span className={`reveal__team reveal__team--${viewer.team}`}>{roleLabel(viewer)}</span>
      <div className="reveal__card">
        <span className="reveal__tagline">{viewer.tagline}</span>
        <p className="reveal__text">{personalize(viewer.revealText, nickname)}</p>
      </div>
      <div className="reveal__ability">
        <span className="reveal__ability-label">특수 능력 · {viewer.abilityName}</span>
        <p>{viewer.abilityDescription}</p>
        <span className="reveal__ability-hint">조사실에서 단서를 확보하면 사용할 수 있게 된다.</span>
      </div>
      <button className="reveal__button" onClick={acknowledgeRole}>
        각오는 되었다
      </button>
    </div>
  )
}
