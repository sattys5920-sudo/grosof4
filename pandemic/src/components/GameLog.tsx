import type { LogEntry } from '../engine/types'

export default function GameLog({ log }: { log: LogEntry[] }) {
  return (
    <div className="game-log">
      <div className="game-log-title">기록</div>
      <ul>
        {log.slice(0, 60).map((entry, i) => (
          <li key={i} className={`log-tag-${entry.tag}`}>
            <span className="log-turn">T{entry.turn}</span> {entry.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
