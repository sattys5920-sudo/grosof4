import type { SurvivorInstance } from '../engine/types'
import { SURVIVOR_MAP } from '../engine/survivors'

/** STEP 4 범위: 생존자 카드를 보여주기만 한다. 상처·동상 게이지, 장착
 * 아이템은 STEP 6~7에서 이 카드에 이어 붙인다. */
export default function SurvivorCard({ instance }: { instance: SurvivorInstance }) {
  const base = SURVIVOR_MAP[instance.survivorId]
  if (!base) return null

  return (
    <div className={`survivor-card${instance.isLeader ? ' leader' : ''}`}>
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
      <p className="survivor-card-ability">{base.ability}</p>
    </div>
  )
}
