import { useEffect, useState } from 'react'
import './TopBarAlert.css'
import { useGame } from '../state/GameContext'

const VISIBLE_MS = 6000
const EXIT_MS = 300

export function TopBarAlert() {
  const { topAlert, dismissTopAlert } = useGame()
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!topAlert) return
    setClosing(false)
    const closeTimer = setTimeout(() => setClosing(true), VISIBLE_MS)
    const dismissTimer = setTimeout(dismissTopAlert, VISIBLE_MS + EXIT_MS)
    return () => {
      clearTimeout(closeTimer)
      clearTimeout(dismissTimer)
    }
  }, [topAlert, dismissTopAlert])

  if (!topAlert) return null

  return (
    <div className={`topalert ${closing ? 'is-closing' : ''}`} role="status" onClick={dismissTopAlert}>
      <span className="topalert__dot" />
      <span className="topalert__text">{topAlert.text}</span>
    </div>
  )
}
