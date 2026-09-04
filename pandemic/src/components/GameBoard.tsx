import { CITIES, CITY_IDS } from '../engine/map'
import type { CityId, DiseaseColor, GameState } from '../engine/types'

const COLOR_VAR: Record<DiseaseColor, string> = { blue: 'var(--blue)', yellow: 'var(--yellow)', black: 'var(--black)', red: 'var(--red)' }
const COLOR_KO: Record<DiseaseColor, string> = { blue: '파란색', yellow: '노란색', black: '검은색', red: '빨간색' }
const DISEASE_ORDER: DiseaseColor[] = ['blue', 'yellow', 'black', 'red']

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

  // map.ts의 좌표 자체가 이미 라벨/큐브가 안 겹치도록 손으로 간격을 벌려
  // 잡은 값이라, 여기서는 그대로 쓰고 여백만 더해서 잘리지 않게 한다.
  const pos = (id: CityId) => ({ x: CITIES[id].x, y: CITIES[id].y })

  const allPos = CITY_IDS.map(pos)
  const PAD = 90
  const minX = Math.min(...allPos.map((p) => p.x)) - PAD
  const maxX = Math.max(...allPos.map((p) => p.x)) + PAD
  const minY = Math.min(...allPos.map((p) => p.y)) - PAD
  const maxY = Math.max(...allPos.map((p) => p.y)) + PAD

  return (
    <div className="board-wrap">
      <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="board-svg" preserveAspectRatio="xMidYMid meet">
        {edges.map(([a, b]) => (
          <line key={`${a}-${b}`} x1={pos(a).x} y1={pos(a).y} x2={pos(b).x} y2={pos(b).y} className="board-edge" />
        ))}

        {CITY_IDS.map((id) => {
          const c = CITIES[id]
          const { x: cx, y: cy } = pos(id)
          const cubes = c && (state.cubes[id] ?? {})
          const cubeColors = DISEASE_ORDER.filter((color) => (cubes[color] ?? 0) > 0)
          const hasStation = state.stations.includes(id)
          const isHighlighted = highlightSet.has(id)
          const isSelected = selectedCity === id
          const playersHere = (['p1', 'p2'] as const).filter((pid) => state.players[pid].location === id)
          const isCurrentPlayerHere = state.players[state.currentPlayer].location === id
          const infected = cubeColors.length > 0

          return (
            <g
              key={id}
              className={`board-city ${isHighlighted ? 'highlighted' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => onCityClick?.(id)}
              style={{ cursor: onCityClick ? 'pointer' : 'default' }}
            >
              {isCurrentPlayerHere && <circle cx={cx} cy={cy} r={17} className="board-city-current-ring" />}
              {isHighlighted && <circle cx={cx} cy={cy} r={14} className="board-city-glow" />}
              {infected && <circle cx={cx} cy={cy} r={11} className="board-city-infected-ring" />}

              <circle cx={cx} cy={cy} r={8} fill={COLOR_VAR[c.color]} stroke="#0a0e14" strokeWidth={2} />
              {hasStation && <rect x={cx - 5} y={cy - 5} width={10} height={10} className="board-station" />}

              <rect x={cx - c.name.length * 4.4 - 3} y={cy - 27} width={c.name.length * 8.8 + 6} height={13} className="board-city-label-bg" />
              <text x={cx} y={cy - 17} className="board-city-label">
                {c.name}
              </text>

              {cubeColors.map((color, i) => {
                const bx = cx + 14 + i * 15
                const by = cy - 14
                return (
                  <g key={color}>
                    <circle cx={bx} cy={by} r={7.5} fill={COLOR_VAR[color]} stroke="#0a0e14" strokeWidth={1.5} />
                    <text x={bx} y={by + 3.5} className="board-cube-count">
                      {cubes[color]}
                    </text>
                  </g>
                )
              })}

              {playersHere.length > 0 && (
                <g>
                  <rect x={cx - playersHere.length * 9 - 2} y={cy + 10} width={playersHere.length * 18 + 4} height={16} rx={8} className="board-pawn-bg" />
                  {playersHere.map((pid, i) => (
                    <circle
                      key={pid}
                      cx={cx - (playersHere.length - 1) * 9 + i * 18}
                      cy={cy + 18}
                      r={7}
                      className={`board-pawn board-pawn-${pid}`}
                    />
                  ))}
                </g>
              )}
            </g>
          )
        })}
      </svg>

      <div className="board-legend">
        <div className="board-legend-group">
          {DISEASE_ORDER.map((color) => (
            <span key={color} className="board-legend-item">
              <span className="board-legend-swatch" style={{ background: COLOR_VAR[color] }} />
              {COLOR_KO[color]}
            </span>
          ))}
        </div>
        <div className="board-legend-group">
          <span className="board-legend-item">
            <span className="board-legend-pawn board-pawn-p1" /> 플레이어 1
          </span>
          <span className="board-legend-item">
            <span className="board-legend-pawn board-pawn-p2" /> 플레이어 2
          </span>
          <span className="board-legend-item">
            <span className="board-legend-station" /> 연구소
          </span>
          <span className="board-legend-item">
            <span className="board-legend-ring" /> 현재 차례 위치
          </span>
        </div>
      </div>
    </div>
  )
}
