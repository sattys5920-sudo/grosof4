import './Badge.css'
import type { Team } from '../data/types'

export function Badge({
  team,
  size = 28,
  revealed = true,
}: {
  team: Team
  size?: number
  revealed?: boolean
}) {
  if (!revealed) {
    return (
      <span
        className="badge badge--unknown"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
        aria-hidden="true"
      >
        ?
      </span>
    )
  }
  return (
    <span
      className={`badge badge--${team}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="badge__mark" />
    </span>
  )
}
