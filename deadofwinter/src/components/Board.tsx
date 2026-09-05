import { LOCATIONS } from '../engine/locations'

/** STEP 3 범위: 장소 7곳을 보여주기만 한다. 각 칸에 생존자·좀비·아이템이
 * 표시되는 건 STEP 4(생존자)·STEP 6(탐색)·STEP 7(좀비)에서 이 컴포넌트에
 * 이어 붙인다. */
export default function Board() {
  const colony = LOCATIONS[0]
  const outer = LOCATIONS.slice(1)

  return (
    <div className="board">
      <div className="board-colony">
        <span className="board-tile-icon">{colony.icon}</span>
        <span className="board-tile-name">{colony.name}</span>
      </div>
      <div className="board-outer">
        {outer.map((loc) => (
          <div key={loc.id} className="board-tile" title={loc.description}>
            <span className="board-tile-icon">{loc.icon}</span>
            <span className="board-tile-name">{loc.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
