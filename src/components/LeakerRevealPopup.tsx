import '../components/BroadcastPopup.css'
import { useGame } from '../state/GameContext'
import { leakerRevealText } from '../data/characters'

export function LeakerRevealPopup() {
  const { leakRevealPending, dismissLeakReveal, forgottenIdentity } = useGame()

  if (!leakRevealPending || !forgottenIdentity) return null

  const text = leakerRevealText(forgottenIdentity === 'ward' ? '학생' : '괴이')

  return (
    <div className="bcpopup__backdrop" role="alertdialog" aria-modal="true">
      <div className="bcpopup bcpopup--event">
        <span className="bcpopup__kind">기억이 돌아왔다</span>
        <h3 className="bcpopup__title">유포자</h3>
        <p className="bcpopup__body">{text}</p>
        <button className="bcpopup__dismiss" onClick={dismissLeakReveal}>
          확인
        </button>
      </div>
    </div>
  )
}
