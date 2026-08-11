import { useState } from 'react'
import './ClassroomScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS } from '../data/characters'

export function ClassroomScreen() {
  const {
    viewerId,
    classroom,
    classroomMessages,
    sendClassroomMessage,
    attemptDuel,
    submitPuzzleAnswer,
    displayName,
  } = useGame()
  const [draft, setDraft] = useState('')
  const [answer, setAnswer] = useState('')

  if (classroom.status === 'locked') {
    return (
      <div className="classroom classroom--locked">
        <span className="classroom__lock-icon">▧</span>
        <p className="classroom__lock-text">
          교실은 잠겨 있다. 전체 조사가 시작되면 알림이 울릴 것이다.
        </p>
      </div>
    )
  }

  const event = classroom.event!
  const isDuel = event.kind === 'duel'
  const canChat = !!viewerId

  function submit() {
    sendClassroomMessage(draft)
    setDraft('')
  }

  function submitAnswer() {
    submitPuzzleAnswer(answer)
    setAnswer('')
  }

  return (
    <div className="classroom">
      <div className={`classroom__pin ${classroom.status === 'cleared' ? 'is-cleared' : ''}`}>
        {event.category && <span className="classroom__pin-tag">{event.category}</span>}
        <span className="classroom__pin-title">{event.title}</span>
        <p className="classroom__pin-desc">{event.description}</p>
        {event.puzzleText && classroom.status === 'active' && (
          <pre className="classroom__pin-puzzle">{event.puzzleText}</pre>
        )}
        {classroom.status === 'active' && !isDuel && event.answer && (
          <div className="classroom__pin-answer">
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
              placeholder="다 같이 상의한 정답을 입력..."
            />
            <button onClick={submitAnswer}>제출</button>
          </div>
        )}
        {classroom.status === 'active' && isDuel && (
          <div className="classroom__pin-answer">
            <button onClick={() => attemptDuel('odd')}>홀</button>
            <button onClick={() => attemptDuel('even')}>짝</button>
          </div>
        )}
        {classroom.note && <p className="classroom__pin-note">{classroom.note}</p>}
        {classroom.status === 'cleared' && classroom.hint && (
          <div className="classroom__pin-hint">
            <span>전원에게 공개된 단서</span>
            <p>{classroom.hint}</p>
          </div>
        )}
      </div>

      <div className="classroom__log">
        {classroomMessages.length === 0 && (
          <p className="classroom__empty">아직 아무도 말하지 않았다. 함께 의논해보자.</p>
        )}
        {classroomMessages.map((m) => {
          const author = CHARACTERS.find((c) => c.id === m.authorId)
          const isMe = m.authorId === viewerId
          return (
            <div key={m.id} className={`classroom__msg ${isMe ? 'is-me' : ''}`}>
              <div className="classroom__msg-head">
                <span className="classroom__msg-name">{author ? displayName(author.id) : '???'}</span>
              </div>
              <p className="classroom__msg-text">{m.text}</p>
            </div>
          )
        })}
      </div>

      {canChat ? (
        <div className="classroom__composer">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="교실에 메시지 보내기..."
          />
          <button onClick={submit}>전송</button>
        </div>
      ) : (
        <p className="classroom__admin-note">관리자는 관전만 가능하다.</p>
      )}
    </div>
  )
}
