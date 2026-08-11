import { useState } from 'react'
import './DmModal.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS } from '../data/characters'
import { isRevealedTo } from '../data/reveal'
import { Badge } from '../components/Badge'

export function DmModal() {
  const { viewerId, gmReveal, activeDmId, dmThreads, closeDm, sendDm, displayName } = useGame()
  const [draft, setDraft] = useState('')

  if (!activeDmId) return null

  const viewer = CHARACTERS.find((c) => c.id === viewerId)!
  const target = CHARACTERS.find((c) => c.id === activeDmId)!
  const revealed = isRevealedTo(viewer, target, gmReveal)
  const thread = dmThreads[activeDmId] ?? []

  function submit() {
    if (!draft.trim()) return
    sendDm(draft)
    setDraft('')
  }

  return (
    <div className="dm__backdrop" role="dialog" aria-modal="true">
      <div className="dm">
        <div className="dm__head">
          <Badge team={target.team} size={28} revealed={revealed} />
          <span className="dm__name">{displayName(target.id)}에게 귓속말</span>
          <button className="dm__close" onClick={closeDm}>
            닫기
          </button>
        </div>
        <div className="dm__thread">
          {thread.length === 0 && (
            <p className="dm__empty">아무도 모르게 {displayName(target.id)}에게 말을 걸어보자.</p>
          )}
          {thread.map((m) => (
            <div key={m.id} className={`dm__msg ${m.authorId === viewerId ? 'is-me' : ''}`}>
              <span className="dm__msg-text">{m.text}</span>
            </div>
          ))}
        </div>
        <div className="dm__composer">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="조용히 속삭이기..."
          />
          <button onClick={submit}>전송</button>
        </div>
      </div>
    </div>
  )
}
