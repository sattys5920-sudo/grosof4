import type { Location, SurvivorInstance } from '../engine/types'
import { SURVIVOR_MAP } from '../engine/survivors'
import { WOUND_LIMIT } from '../engine/logic'

/** STEP 7 범위: 상처/동상 상태까지 함께 보여준다. 죽은 생존자는 이
 * 컴포넌트를 부르는 쪽에서 걸러내는 게 기본이지만, 만약을 위해 alive가
 * false면 표시만 다르게 한다. */
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

  const classes = `survivor-card${instance.isLeader ? ' leader' : ''}${selected ? ' selected' : ''}${onClick ? ' clickable' : ''}${!instance.alive ? ' dead' : ''}`

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
      {!instance.alive ? (
        <div className="survivor-card-dead-badge">{instance.banished ? '🚪 추방됨' : '💀 사망'}</div>
      ) : (
        <div className="survivor-card-condition">
          {instance.wounds > 0 && (
            <span className="condition-badge wound">
              🩸 상처 {instance.wounds}/{WOUND_LIMIT}
            </span>
          )}
          {instance.frostbite && <span className="condition-badge frostbite">❄️ 동상</span>}
        </div>
      )}
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
