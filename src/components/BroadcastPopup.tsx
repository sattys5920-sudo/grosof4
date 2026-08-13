import { useEffect } from 'react'
import './BroadcastPopup.css'
import { useGame } from '../state/GameContext'

const KIND_LABEL: Record<string, string> = {
  event: '긴급 이벤트',
  sin: '괴이 출현',
  notice: '교내 방송',
}

export function BroadcastPopup() {
  const { broadcast, dismissBroadcast, notifyRoomEvents, notifyGeneralBroadcasts } = useGame()
  const suppressed =
    !!broadcast && (broadcast.kind === 'sin' ? !notifyRoomEvents : !notifyGeneralBroadcasts)

  useEffect(() => {
    if (suppressed) dismissBroadcast()
  }, [suppressed, dismissBroadcast])

  if (!broadcast || suppressed) return null

  return (
    <div className="bcpopup__backdrop" role="alertdialog" aria-modal="true">
      <div
        className={`bcpopup bcpopup--${broadcast.kind}${
          broadcast.variant ? ` bcpopup--variant-${broadcast.variant}` : ''
        }`}
      >
        <span className="bcpopup__kind">{KIND_LABEL[broadcast.kind]}</span>
        <h3 className="bcpopup__title">{broadcast.title}</h3>
        <p className="bcpopup__body">{broadcast.body}</p>
        <button className="bcpopup__dismiss" onClick={dismissBroadcast}>
          확인
        </button>
      </div>
    </div>
  )
}
