import { useState } from 'react'
import './RoomsScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS, ROOMS } from '../data/characters'
import type { RoomId } from '../data/types'
import { isRevealedTo } from '../data/reveal'
import { Badge } from '../components/Badge'

function charOf(id: string) {
  return CHARACTERS.find((c) => c.id === id)!
}

function AdminRoomLog({ roomId }: { roomId: RoomId }) {
  const { roomMessages, displayName } = useGame()
  const room = ROOMS.find((r) => r.id === roomId)!
  return (
    <div className="rooms__admin-room">
      <span className="rooms__admin-room-name">{room.name}</span>
      {roomMessages[roomId].length === 0 && <span className="rooms__empty">대화 없음</span>}
      {roomMessages[roomId].map((m) => (
        <div key={m.id} className="rooms__admin-line">
          <strong>{displayName(m.authorId)}</strong>
          <span>{m.text}</span>
        </div>
      ))}
    </div>
  )
}

export function RoomsScreen() {
  const {
    viewerId,
    isAdmin,
    gmReveal,
    roomOccupancy,
    joinRoom,
    leaveRoom,
    roomMessages,
    sendRoomMessage,
    roomEvents,
    submitRoomAnswer,
    displayName,
  } = useGame()
  const [openRoom, setOpenRoom] = useState<RoomId | null>(null)
  const [draft, setDraft] = useState('')
  const [answer, setAnswer] = useState('')
  const viewer = viewerId ? charOf(viewerId) : null

  function revealedFor(c: ReturnType<typeof charOf>) {
    return viewer ? isRevealedTo(viewer, c, gmReveal) : gmReveal
  }

  if (isAdmin) {
    return (
      <div className="rooms">
        <div className="rooms__intro">
          <span className="rooms__intro-label">관리자 전체 열람</span>
          <p>모든 조사실의 대화를 한 번에 확인한다.</p>
        </div>
        {ROOMS.map((r) => (
          <AdminRoomLog key={r.id} roomId={r.id} />
        ))}
      </div>
    )
  }

  if (openRoom) {
    const room = ROOMS.find((r) => r.id === openRoom)!
    const occupants = roomOccupancy[openRoom]
    const iAmHere = occupants.includes(viewerId ?? '')
    const roomEvent = roomEvents[openRoom]

    function submitChat() {
      sendRoomMessage(openRoom!, draft)
      setDraft('')
    }
    function submitPuzzleAnswer() {
      submitRoomAnswer(openRoom!, answer)
      setAnswer('')
    }

    return (
      <div className="rooms">
        <div className={`rooms__pin ${roomEvent.cleared ? 'is-cleared' : ''}`}>
          <button className="rooms__back" onClick={() => setOpenRoom(null)}>
            ← 조사실 목록
          </button>
          <span className="rooms__pin-title">{room.name}</span>
          <div className="rooms__pin-occupants">
            <span className="rooms__pin-count">{occupants.length}/{room.capacity}</span>
            {occupants.map((id) => {
              const c = charOf(id)
              return <Badge key={id} team={c.team} size={18} revealed={revealedFor(c)} />
            })}
            {iAmHere ? (
              <button className="rooms__pin-toggle" onClick={() => leaveRoom(openRoom!)}>
                나가기
              </button>
            ) : (
              <button
                className="rooms__pin-toggle"
                disabled={occupants.length >= room.capacity}
                onClick={() => joinRoom(openRoom!)}
              >
                {occupants.length >= room.capacity ? '인원 초과' : '입장'}
              </button>
            )}
          </div>

          {!roomEvent.event && <p className="rooms__pin-ambient">{room.ambientText}</p>}

          {roomEvent.event && (
            <>
              {roomEvent.event.category && (
                <span className="rooms__pin-tag">{roomEvent.event.category}</span>
              )}
              <span className="rooms__pin-puzzle-title">{roomEvent.event.title}</span>
              <p className="rooms__pin-desc">{roomEvent.event.description}</p>
              {!roomEvent.cleared && roomEvent.event.puzzleText && (
                <pre className="rooms__pin-puzzletext">{roomEvent.event.puzzleText}</pre>
              )}
              {!roomEvent.cleared && iAmHere && (
                <div className="rooms__pin-answer">
                  <input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitPuzzleAnswer()}
                    placeholder="정답 입력......"
                  />
                  <button onClick={submitPuzzleAnswer}>제출</button>
                </div>
              )}
              {!roomEvent.cleared && !iAmHere && (
                <p className="rooms__pin-note">입장한 사람만 함께 풀 수 있다.</p>
              )}
              {roomEvent.note && <p className="rooms__pin-note">{roomEvent.note}</p>}
              {roomEvent.cleared && (
                <div className="rooms__pin-hint">
                  <span>단서 확보</span>
                  <p>{roomEvent.clue}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rooms__log">
          {roomMessages[openRoom].length === 0 && (
            <p className="rooms__empty">아직 대화가 없다.</p>
          )}
          {roomMessages[openRoom].map((m) => (
            <div key={m.id} className={`rooms__msg ${m.authorId === viewerId ? 'is-me' : ''}`}>
              <span className="rooms__msg-name">{displayName(m.authorId)}</span>
              <p className="rooms__msg-text">{m.text}</p>
            </div>
          ))}
        </div>

        {iAmHere ? (
          <div className="rooms__composer">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitChat()}
              placeholder={`${room.name}에서 대화하기......`}
            />
            <button onClick={submitChat}>전송</button>
          </div>
        ) : (
          <p className="rooms__locked-note">입장한 사람만 대화할 수 있다.</p>
        )}
      </div>
    )
  }

  return (
    <div className="rooms">
      <div className="rooms__intro">
        <span className="rooms__intro-label">조사실</span>
        <p>선착순으로 입장한다. 각 조사실에는 인원 제한이 있다.</p>
      </div>
      <div className="rooms__grid">
        {ROOMS.map((room) => {
          const occupants = roomOccupancy[room.id]
          const full = occupants.length >= room.capacity
          const cleared = roomEvents[room.id].cleared
          const investigating = !!roomEvents[room.id].event && !cleared
          return (
            <button key={room.id} className="rooms__card" onClick={() => setOpenRoom(room.id)}>
              <div className="rooms__card-top">
                <span className="rooms__card-name">
                  {room.name}
                  {cleared && <span className="rooms__card-clue-tag">단서 발견</span>}
                  {investigating && <span className="rooms__card-active-tag">조사 중</span>}
                </span>
                <span className={`rooms__card-count ${full ? 'is-full' : ''}`}>
                  {occupants.length}/{room.capacity}
                </span>
              </div>
              <p className="rooms__card-desc">{room.description}</p>
              <div className="rooms__card-avatars">
                {occupants.map((id) => {
                  const c = charOf(id)
                  return <Badge key={id} team={c.team} size={18} revealed={revealedFor(c)} />
                })}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
