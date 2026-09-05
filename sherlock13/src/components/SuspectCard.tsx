import type { Suspect } from '../engine/types'
import { TRAIT_MAP } from '../engine/suspects'

export type SuspectCardSize = 'sm' | 'md' | 'lg'

/** 초상화 대신 오래된 사건철 카드처럼: 이니셜 밀랍 인장 + 이름 + 특징
 * 아이콘 칩으로 구성한 오리지널 카드 디자인. */
export default function SuspectCard({
  suspect,
  size = 'md',
  selected,
  dim,
  onClick,
  cleared,
}: {
  suspect: Suspect
  size?: SuspectCardSize
  selected?: boolean
  dim?: boolean
  cleared?: boolean
  onClick?: () => void
}) {
  const classes = ['suspect-card', `suspect-card-${size}`]
  if (selected) classes.push('selected')
  if (dim) classes.push('dim')
  if (cleared) classes.push('cleared')

  const content = (
    <>
      <div className="suspect-seal">{suspect.name[0]}</div>
      <div className="suspect-name">{suspect.name}</div>
      {size !== 'sm' && <div className="suspect-title">{suspect.title}</div>}
      <div className="suspect-traits">
        {suspect.traits.map((t) => (
          <span key={t} className="suspect-trait" title={TRAIT_MAP[t].label}>
            {TRAIT_MAP[t].icon}
          </span>
        ))}
      </div>
      {cleared && <div className="suspect-cleared-stamp">무죄</div>}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={classes.join(' ')} onClick={onClick}>
        {content}
      </button>
    )
  }
  return <div className={classes.join(' ')}>{content}</div>
}

export function FaceDownCard({ size = 'md', label }: { size?: SuspectCardSize; label?: string }) {
  return (
    <div className={`suspect-card suspect-card-${size} face-down`}>
      <div className="face-down-emblem">🔍</div>
      {label && <div className="face-down-label">{label}</div>}
    </div>
  )
}
