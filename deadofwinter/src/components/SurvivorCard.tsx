import type { Location, SurvivorInstance } from '../engine/types'
import { SURVIVOR_MAP } from '../engine/survivors'

/** STEP 6 범위: 상태 표시 + 내 턴에는 클릭해서 이동·탐색 대상으로 고를 수
 * 있다. 상처·동상 게이지는 STEP 7에서 이 카드에 이어 붙인다. */
export default function SurvivorCard({
  instance,
  location,
  selected,
  onClick,
}: {
  instance: SurvivorInstance
  location?: Location
  selected?: boolean
  onClick?: () => void
}) {
  const base = SURVIVOR_MAP[instance.survivorId]
  if (!base) return null

  const classes = `survivor-card${instance.isLeader ? ' leader' : ''}${selected ? ' selected' : ''}${onClick ? ' clickable' : ''}`

  const content = (
    <>
      <div className="survivor-card-head">
        <span className="survivor-card-icon">{base.icon}</span>
        <div>
          <div className="survivor-card-name">
            {base.name}
            {instance.isLeader && <span className="survivor-card-leader-badge">리더</span>}
          </div>
          <div className="survivor-card-title">{base.title}</div>
        </div>
      </div>
      <div className="survivor-card-stats">
        <span>영향력 {base.influence}</span>
        <span>공격 {base.attack}</span>
      </div>
      {location && (
        <div className="survivor-card-location">
          {location.icon} {location.name}
        </div>
      )}
      <p className="survivor-card-ability">{base.ability}</p>
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {content}
      </button>
    )
  }
  return <div className={classes}>{content}</div>
}
