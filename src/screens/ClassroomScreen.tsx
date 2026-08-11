import { useState } from 'react'
import './ClassroomScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS } from '../data/characters'
import { CLASSROOM_PUZZLES } from '../data/classroomPuzzles'
import { EVENT_LIBRARY } from '../data/eventLibrary'
import { EventDispatchSheet, type DispatchSection } from '../components/EventDispatchSheet'

const CLASSROOM_AMBIENT_TEXT =
  '교실은 조용하다....... 다들 각자 자리에 앉아 서로 눈치만 보고 있다. 아직 무엇을 조사해야 할지는 불가가 정하지 않았다.......'

export function ClassroomScreen() {
  const {
    viewerId,
    isAdmin,
    gmReveal,
    classroom,
    classroomMessages,
    sendClassroomMessage,
    attemptDuel,
    submitPuzzleAnswer,
    dispatchClassroomEvent,
    dispatchPuzzle,
    closeInvestigation,
    displayName,
  } = useGame()
  const [draft, setDraft] = useState('')
  const [answer, setAnswer] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  const event = classroom.event
  const isDuel = event?.kind === 'duel'
  const canChat = !!viewerId

  function submit() {
    sendClassroomMessage(draft)
    setDraft('')
  }

  function submitAnswer() {
    submitPuzzleAnswer(answer)
    setAnswer('')
  }

  const sections: DispatchSection[] = [
    {
      label: '방탈출 문제',
      items: CLASSROOM_PUZZLES.map((puzzle) => ({
        id: puzzle.id,
        category: puzzle.category,
        title: puzzle.title,
        brief: puzzle.brief,
        answer: puzzle.answer,
        onSend: () => dispatchPuzzle(puzzle),
      })),
    },
    {
      label: '미니게임',
      items: EVENT_LIBRARY.filter((item) => item.dispatchKind === 'duel' && item.implemented).map((item) => ({
        id: item.id,
        category: item.category,
        title: item.title,
        brief: item.description,
        onSend: () => dispatchClassroomEvent(item),
      })),
    },
  ]

  return (
    <div className="classroom">
      <div className={`classroom__pin ${classroom.status === 'cleared' ? 'is-cleared' : ''}`}>
        <div className="classroom__pin-head">
          <span className="classroom__pin-heading">교실</span>
          {gmReveal && (
            <div className="classroom__pin-gm">
              {classroom.status !== 'locked' && (
                <button className="classroom__pin-reset" onClick={closeInvestigation}>
                  초기화
                </button>
              )}
              <button className="classroom__pin-plus" onClick={() => setSheetOpen(true)} aria-label="이벤트 발송">
                +
              </button>
            </div>
          )}
        </div>

        {classroom.status === 'locked' && <p className="classroom__pin-ambient">{CLASSROOM_AMBIENT_TEXT}</p>}

        {event && (
          <>
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
                  placeholder="다 같이 상의한 정답을 입력......"
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
          </>
        )}
      </div>

      <div className="classroom__log">
        {classroomMessages.length === 0 && (
          <p className="classroom__empty">아직 아무도 말하지 않았다....... 함께 의논해보자.</p>
        )}
        {classroomMessages.map((m) => {
          const author = CHARACTERS.find((c) => c.id === m.authorId)
          const isMe = m.authorId === viewerId
          return (
            <div key={m.id} className={`classroom__msg ${isMe ? 'is-me' : ''}`}>
              <div className="classroom__msg-head">
                <span className="classroom__msg-name">
                  {m.authorId === 'admin' || author ? displayName(m.authorId) : '???'}
                </span>
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
            placeholder="교실에 메시지 보내기......"
          />
          <button onClick={submit}>전송</button>
        </div>
      ) : (
        isAdmin && <p className="classroom__admin-note">불가는 원정처럼 관전만 하며, 위의 + 버튼으로 이벤트를 발동할 수 있다.</p>
      )}

      {sheetOpen && <EventDispatchSheet sections={sections} onClose={() => setSheetOpen(false)} />}
    </div>
  )
}
