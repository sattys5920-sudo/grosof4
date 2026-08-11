import './RoleRevealScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS, roleLabel } from '../data/characters'
import { Badge } from '../components/Badge'

export function RoleRevealScreen() {
  const { viewerId, nickname, acknowledgeRole } = useGame()
  const viewer = CHARACTERS.find((c) => c.id === viewerId)!

  return (
    <div className="reveal">
      <span className="reveal__eyebrow">{nickname}, 안개가 당신을 삼키기 전에</span>
      <Badge team={viewer.team} size={64} />
      <span className={`reveal__team reveal__team--${viewer.team}`}>{roleLabel(viewer)}</span>
      <p className="reveal__text">{viewer.revealText}</p>
      <button className="reveal__button" onClick={acknowledgeRole}>
        각오는 되었다
      </button>
    </div>
  )
}
