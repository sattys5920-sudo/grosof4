import { useEffect, useRef, useState } from 'react'
import { capacity, finalizePrep, pickPrepItem, unpickPrepItem, usedCapacity } from '../engine/engine'
import { GAME_RULES } from '../engine/rules'
import { ITEMS } from '../engine/items'
import { ROOMS } from '../engine/rooms'
import { saveGame } from '../engine/save'
import type { GameState, RoomId } from '../engine/types'

export default function PrepScreen({ state, onChange }: { state: GameState; onChange: (s: GameState) => void }) {
  const [secondsLeft, setSecondsLeft] = useState<number>(GAME_RULES.PREP_SECONDS)
  const [openRoom, setOpenRoom] = useState<RoomId | null>(null)
  const finishedRef = useRef(false)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (secondsLeft === 0 && !finishedRef.current) {
      finishedRef.current = true
      onChange(finalizePrep(state))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft])

  const used = usedCapacity(state)
  const cap = capacity(state)

  function toggle(pickupId: string, taken: boolean) {
    const next = taken ? unpickPrepItem(state, pickupId) : pickPrepItem(state, pickupId)
    saveGame(next)
    onChange(next)
  }

  function enter() {
    if (finishedRef.current) return
    finishedRef.current = true
    onChange(finalizePrep(state))
  }

  const activeRoom = ROOMS.find((r) => r.id === openRoom) ?? null
  const roomItems = openRoom ? state.prepLayout.filter((p) => p.room === openRoom) : []

  return (
    <div className="prep">
      <header className="prep-header">
        <div className="prep-alarm">경보 발령 — 대피소 폐쇄까지</div>
        <div className={`prep-timer ${secondsLeft <= 10 ? 'urgent' : ''}`}>{secondsLeft}</div>
        <div className="prep-capacity">
          공간 {used} / {cap}
          <div className="prep-capacity-bar">
            <div className="prep-capacity-fill" style={{ width: `${Math.min(100, (used / cap) * 100)}%` }} />
          </div>
        </div>
      </header>

      <div className="floor-plan">
        {ROOMS.map((room) => {
          const items = state.prepLayout.filter((p) => p.room === room.id)
          const takenCount = items.filter((p) => p.taken).length
          return (
            <button
              key={room.id}
              className={`room-btn ${openRoom === room.id ? 'open' : ''}`}
              onClick={() => setOpenRoom(openRoom === room.id ? null : room.id)}
            >
              <div className="room-name">{room.name}</div>
              <div className="room-meta">
                {takenCount}/{items.length}
              </div>
            </button>
          )
        })}
      </div>

      {activeRoom && (
        <div className="room-detail">
          <div className="room-detail-title">{activeRoom.name}</div>
          {roomItems.length === 0 && <p className="muted">아무것도 없다.</p>}
          <div className="room-items">
            {roomItems.map((p) => {
              const def = ITEMS[p.item]
              const wouldExceed = !p.taken && used + def.space > cap
              return (
                <button
                  key={p.id}
                  className={`prep-item ${p.taken ? 'picked' : ''} ${wouldExceed ? 'disabled' : ''}`}
                  disabled={wouldExceed && !p.taken}
                  onClick={() => toggle(p.id, p.taken)}
                >
                  <div className="prep-item-name">{def.name}</div>
                  <div className="prep-item-space">공간 {def.space}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <footer className="prep-footer">
        <p className="prep-hint">
          방을 눌러 무엇이 있는지 확인한다. 이미 챙긴 물건은 다시 눌러 내려놓을 수 있다. 시간이 다 되면 자동으로 대피소 문이 닫힌다.
        </p>
        <button className="btn btn-primary" onClick={enter}>
          지금 대피소로 들어간다
        </button>
      </footer>
    </div>
  )
}
