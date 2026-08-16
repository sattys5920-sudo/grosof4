import '../components/BroadcastPopup.css'
import { useGame } from '../state/GameContext'

export function PersonalRevealPopup() {
  const { personalPopup, dismissPersonalPopup } = useGame()
  if (!personalPopup) return null

  return (
    <div className="bcpopup__backdrop" role="alertdialog" aria-modal="true">
      <div className="bcpopup bcpopup--event">
        <span className="bcpopup__kind">개인 기억</span>
        <h3 className="bcpopup__title">{personalPopup.title}</h3>
        <p className="bcpopup__body">{personalPopup.body}</p>
        <button className="bcpopup__dismiss" onClick={dismissPersonalPopup}>
          확인
        </button>
      </div>
    </div>
  )
}
