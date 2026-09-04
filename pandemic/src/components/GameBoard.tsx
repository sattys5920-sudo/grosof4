import { CITIES, CITY_IDS } from '../engine/map'
import type { CityId, GameState } from '../engine/types'

const COLOR_VAR: Record<string, string> = { blue: 'var(--blue)', yellow: 'var(--yellow)', black: 'var(--black)', red: 'var(--red)' }

export default function GameBoard({
  state,
  highlighted,
  onCityClick,
  selectedCity,
}: {
  state: GameState
  highlighted: CityId[]
  onCityClick?: (city: CityId) => void
  selectedCity: CityId | null
}) {
  const edges: Array<[CityId, CityId]> = []
  const seen = new Set<string>()
  for (const id of CITY_IDS) {
    for (const conn of CITIES[id].connections) {
      const key = [id, conn].sort().join('-')
      if (seen.has(key)) continue
      seen.add(key)
      edges.push([id, conn])
    }
  }

  const highlightSet = new Set(highlighted)

  return (
    <div className="board-wrap">
      <svg viewBox="0 0 1000 420" className="board-svg" preserveAspectRatio="xMidYMid meet">
        {edges.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={CITIES[a].x}
            y1={CITIES[a].y * 0.75}
            x2={CITIES[b].x}
            y2={CITIES[b].y * 0.75}
            className="board-edge"
          />
        ))}

        {CITY_IDS.map((id) => {
          const c = CITIES[id]
          const cx = c.x
          const cy = c.y * 0.75
          const cubes = state.cubes[id] ?? {}
          const hasStation = state.stations.includes(id)
          const isHighlighted = highlightSet.has(id)
          const isSelected = selectedCity === id
          const playersHere = (['p1', 'p2'] as const).filter((pid) => state.players[pid].location === id)

          return (
            <g
              key={id}
              className={`board-city ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => onCityClick?.(id)}
              style={{ cursor: onCityClick ? 'pointer' : 'default' }}
            >
              {isHighlighted && <circle cx={cx} cy={cy} r={11} className="board-city-glow" />}
              <circle cx={cx} cy={cy} r={6} fill={COLOR_VAR[c.color]} stroke="#0a0e14" strokeWidth={1.5} />
              {hasStation && <rect x={cx - 4} y={cy - 4} width={8} height={8} className="board-station" />}
              <text x={cx} y={cy - 10} className="board-city-label">
                {c.name}
              </text>
              {Object.entries(cubes).map(([color, n], i) =>
                n && n > 0 ? (
                  <text key={color} x={cx + 9} y={cy + 4 + i * 10} className="board-cube-count" fill={COLOR_VAR[color]}>
                    ●{n}
                  </text>
                ) : null,
              )}
              {playersHere.length > 0 && (
                <text x={cx} y={cy + 18} className="board-pawns">
                  {playersHere.map((pid) => (pid === 'p1' ? '🔵' : '🟠')).join(' ')}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
