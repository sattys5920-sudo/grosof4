import type { LocationId } from '../engine/types'
import { LOCATIONS } from '../engine/locations'

/** STEP 7 범위: 장소마다 좀비 수를 함께 보여준다. 라운드마다 자동으로
 * 좀비가 늘어나는 처리(섹션 11)는 콜로니 단계를 만드는 STEP 8~9에서
 * 이어서 구현한다. */
export default function Board({ zombies }: { zombies?: Partial<Record<LocationId, number>> }) {
  const colony = LOCATIONS[0]
  const outer = LOCATIONS.slice(1)

  return (
    <div className="board">
      <div className="board-colony">
        <span className="board-tile-icon">{colony.icon}</span>
        <span className="board-tile-name">{colony.name}</span>
      </div>
      <div className="board-outer">
        {outer.map((loc) => {
          const zombieCount = zombies?.[loc.id] ?? 0
          return (
            <div key={loc.id} className="board-tile" title={loc.description}>
              <span className="board-tile-icon">{loc.icon}</span>
              <span className="board-tile-name">{loc.name}</span>
              {zombieCount > 0 && <span className="board-tile-zombies">🧟 {zombieCount}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
