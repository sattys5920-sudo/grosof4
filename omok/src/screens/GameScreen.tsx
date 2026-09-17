import { useMemo } from 'react'
import { BOARD_SIZE } from '../engine/types'
import type { Role, RoomDoc } from '../engine/types'
import { applyMoves, roleColor } from '../engine/board'

const STAR_POINTS = new Set(['3-3', '3-11', '11-3', '11-11', '7-7'])

export default function GameScreen({
  code,
  role,
  room,
  remainingSeconds,
  busy,
  errorMsg,
  onPlace,
}: {
  code: string
  role: Role
  room: RoomDoc
  remainingSeconds: number
  busy: boolean
  errorMsg: string
  onPlace: (row: number, col: number) => void
}) {
  const board = useMemo(() => applyMoves(room.moves), [room.moves])
  const myColor = roleColor(role)
  const myTurn = room.currentTurn === role
  const lastMove = room.moves[room.moves.length - 1] ?? null
  const winCells = useMemo(() => new Set((room.result?.line ?? []).map((p) => `${p.row}-${p.col}`)), [room.result])

  const hostColorLabel = '흑'
  const guestColorLabel = '백'
  const turnName = room.currentTurn === 'host' ? room.hostName || '호스트' : room.guestName || '게스트'

  const urgent = remainingSeconds <= 10

  return (
    <div className="game-screen">
      <div className="game-topbar">
        <div className="player-chip host">
          <span className="stone-icon black" /> {room.hostName || '호스트'} ({hostColorLabel})
        </div>
        <div className="room-code-badge">{code}</div>
        <div className="player-chip guest">
          <span className="stone-icon white" /> {room.guestName || '게스트'} ({guestColorLabel})
        </div>
      </div>

      <div className="turn-banner">
        <p className="turn-label">{myTurn ? '🎯 나의 차례' : `⏳ ${turnName}의 차례를 기다리는 중…`}</p>
        <p className={`turn-timer ${urgent ? 'urgent' : ''}`}>{remainingSeconds}초</p>
      </div>

      {errorMsg && <p className="game-error">{errorMsg}</p>}

      <div className="board-wrap">
        <div className="board">
          {board.map((rowCells, row) =>
            rowCells.map((cell, col) => {
              const key = `${row}-${col}`
              const isStar = STAR_POINTS.has(key)
              const isLast = lastMove && lastMove.row === row && lastMove.col === col
              const isWin = winCells.has(key)
              const leftPct = ((col + 0.5) / BOARD_SIZE) * 100
              const topPct = ((row + 0.5) / BOARD_SIZE) * 100
              return (
                <button
                  type="button"
                  key={key}
                  className={`board-point ${isWin ? 'win' : ''}`}
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                  disabled={busy || !myTurn || room.phase !== 'playing' || cell !== null}
                  onClick={() => onPlace(row, col)}
                >
                  {isStar && !cell && <span className="star-point" />}
                  {cell && <span className={`stone ${cell} ${isLast ? 'last' : ''}`} />}
                </button>
              )
            }),
          )}
        </div>
      </div>

      <p className="my-color-hint">
        내 돌: <span className={`stone-icon ${myColor}`} /> {myColor === 'black' ? '흑 (쌍삼 금지)' : '백'}
      </p>

      <div className="game-log">
        {room.log
          .slice(-6)
          .reverse()
          .map((entry) => (
            <p key={entry.at} className="log-line">
              {entry.text}
            </p>
          ))}
      </div>
    </div>
  )
}
