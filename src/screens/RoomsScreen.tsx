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
    gmReveal,
    roomOccupancy,
    joinRoom,
    leaveRoom,
    roomMessages,
    sendRoomMessage,
    roomEvents,
    attemptRoomEvent,
    displayName,
  } = useGame()
  const [openRoom, setOpenRoom] = useState<RoomId | null>(null)
  const [adminView, setAdminView] = useState(false)
  const [draft, setDraft] = useState('')
  const viewer = charOf(viewerId)

  if (adminView) {
    return (
      <div className="rooms">
        <div className="rooms__detail-head">
          <button className="rooms__back" onClick={() => setAdminView(false)}>
            ← 조사실 목록
          </button>
          <h2>관리자 전체 열람</h2>
          <p className="rooms__desc">모든 조사실의 대화를 한 번에 확인한다.</p>
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
    const iAmHere = occupants.includes(viewerId)
    const roomEvent = roomEvents[openRoom]

    return (
      <div className="rooms">
        <div className="rooms__detail-head">
          <button className="rooms__back" onClick={() => setOpenRoom(null)}>
            ← 조사실 목록
          </button>
          <h2>{room.name}</h2>
          <p className="rooms__desc">{room.description}</p>
        </div>

        <div className="rooms__section">
          <span className="rooms__section-label">현재 인원 ({occupants.length}/{room.capacity})</span>
          <div className="rooms__occupants">
            {occupants.length === 0 && <span className="rooms__empty">아직 아무도 없다</span>}
            {occupants.map((id) => {
              const c = charOf(id)
              return (
                <div key={id} className="rooms__occupant">
                  <Badge team={c.team} size={22} revealed={isRevealedTo(viewer, c, gmReveal)} />
                  <span>{displayName(id)}</span>
                  {id === viewerId && <span className="rooms__me-tag">나</span>}
                </div>
              )
            })}
          </div>
          {iAmHere ? (
            <button className="rooms__leave" onClick={() => leaveRoom(openRoom)}>
              조사실에서 나가기
            </button>
          ) : (
            <button
              className="rooms__join"
              disabled={occupants.length >= room.capacity}
              onClick={() => joinRoom(openRoom)}
            >
              {occupants.length >= room.capacity ? '인원 초과' : '입장하기'}
            </button>
          )}
        </div>

        <div className="rooms__section">
          <span className="rooms__section-label">대화</span>
          <div className="rooms__chat-log">
            {roomMessages[openRoom].map((m) => (
              <div key={m.id} className="rooms__chat-line">
                <span className="rooms__chat-author">{displayName(m.authorId)}</span>
                <span className="rooms__chat-text">{m.text}</span>
              </div>
            ))}
          </div>
          {iAmHere ? (
            <div className="rooms__composer">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    sendRoomMessage(openRoom, draft)
                    setDraft('')
                  }
                }}
                placeholder={`${room.name}에서 대화하기...`}
              />
              <button
                onClick={() => {
                  sendRoomMessage(openRoom, draft)
                  setDraft('')
                }}
              >
                전송
              </button>
            </div>
          ) : (
            <p className="rooms__locked-note">입장한 사람만 대화할 수 있다.</p>
          )}
        </div>

        <div className="rooms__section">
          <span className="rooms__section-label">진행 중인 조사</span>
          <div className="rooms__clue">
            <span className="rooms__clue-title">{roomEvent.event!.title}</span>
            <p className="rooms__clue-text">{roomEvent.event!.description}</p>
            {roomEvent.cleared ? (
              <>
                <p className="rooms__clue-result">
                  단서 확보 — 참여: {roomEvent.participants.map((id) => displayName(id)).join(', ')}
                </p>
                <p className="rooms__clue-text rooms__clue-text--reward">{roomEvent.clue}</p>
              </>
            ) : iAmHere ? (
              <button className="rooms__join" onClick={() => attemptRoomEvent(openRoom)}>
                함께 조사하기 ({occupants.length}/{room.capacity})
              </button>
            ) : (
              <p className="rooms__locked-note">입장한 사람만 함께 조사할 수 있다.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rooms">
      <div className="rooms__intro">
        <span className="rooms__intro-label">조사실</span>
        <p>선착순으로 입장한다. 각 조사실에는 인원 제한이 있다.</p>
        {gmReveal && (
          <button className="rooms__admin-btn" onClick={() => setAdminView(true)}>
            [관리자] 전체 대화 열람
          </button>
        )}
      </div>
      <div className="rooms__grid">
        {ROOMS.map((room) => {
          const occupants = roomOccupancy[room.id]
          const full = occupants.length >= room.capacity
          const cleared = roomEvents[room.id].cleared
          return (
            <button key={room.id} className="rooms__card" onClick={() => setOpenRoom(room.id)}>
              <div className="rooms__card-top">
                <span className="rooms__card-name">
                  {room.name}
                  {cleared && <span className="rooms__card-clue-tag">단서 발견</span>}
                </span>
                <span className={`rooms__card-count ${full ? 'is-full' : ''}`}>
                  {occupants.length}/{room.capacity}
                </span>
              </div>
              <p className="rooms__card-desc">{room.description}</p>
              <div className="rooms__card-avatars">
                {occupants.map((id) => {
                  const c = charOf(id)
                  return (
                    <Badge
                      key={id}
                      team={c.team}
                      size={18}
                      revealed={isRevealedTo(viewer, c, gmReveal)}
                    />
                  )
                })}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
