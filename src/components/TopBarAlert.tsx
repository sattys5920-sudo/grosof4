import { useEffect } from 'react'
import './TopBarAlert.css'
import { useGame } from '../state/GameContext'

const AUTO_DISMISS_MS = 4500

export function TopBarAlert() {
  const { topAlert, dismissTopAlert } = useGame()

  useEffect(() => {
    if (!topAlert) return
    const timer = setTimeout(dismissTopAlert, AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [topAlert, dismissTopAlert])

  if (!topAlert) return null

  return (
    <div className="topalert" role="status" onClick={dismissTopAlert}>
      <span className="topalert__dot" />
      <span className="topalert__text">{topAlert.text}</span>
    </div>
  )
}
