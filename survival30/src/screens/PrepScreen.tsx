import { useEffect, useRef, useState } from 'react'
import { capacity, finalizePrep, pickPrepItem, unpickPrepItem, usedCapacity } from '../engine/engine'
import { GAME_RULES } from '../engine/rules'
import { ITEMS, PREP_ITEM_ORDER } from '../engine/items'
import { saveGame } from '../engine/save'
import type { GameState } from '../engine/types'
import type { ItemId } from '../engine/types'

export default function PrepScreen({ state, onChange }: { state: GameState; onChange: (s: GameState) => void }) {
  const [secondsLeft, setSecondsLeft] = useState<number>(GAME_RULES.PREP_SECONDS)
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
  const pickedWater = !!state.flags['prep:water']
  const pickedCan = !!state.flags['prep:can']

  function toggle(id: ItemId, picked: boolean) {
    const next = picked ? unpickPrepItem(state, id) : pickPrepItem(state, id)
    saveGame(next)
    onChange(next)
  }

  function enter() {
    if (finishedRef.current) return
    finishedRef.current = true
    onChange(finalizePrep(state))
  }

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

      <div className="prep-grid">
        {PREP_ITEM_ORDER.map((id) => {
          const def = ITEMS[id]
          const picked = id === 'water' ? pickedWater : id === 'can' ? pickedCan : (state.inventory[id] ?? 0) > 0
          const wouldExceed = !picked && used + def.space > cap
          return (
            <button
              key={id}
              className={`prep-item ${picked ? 'picked' : ''} ${wouldExceed ? 'disabled' : ''}`}
              disabled={wouldExceed && !picked}
              onClick={() => toggle(id, picked)}
            >
              <div className="prep-item-name">{def.name}</div>
              <div className="prep-item-space">공간 {def.space}</div>
              <div className="prep-item-desc">{def.description}</div>
            </button>
          )
        })}
      </div>

      <footer className="prep-footer">
        <p className="prep-hint">이미 챙긴 물건은 눌러서 다시 내려놓을 수 있다. 시간이 다 되면 자동으로 대피소 문이 닫힌다.</p>
        <button className="btn btn-primary" onClick={enter}>
          지금 대피소로 들어간다
        </button>
      </footer>
    </div>
  )
}
