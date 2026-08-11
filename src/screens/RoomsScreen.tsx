import { useState } from 'react'
import './RoomsScreen.css'
import { useGame } from '../state/GameContext'
import { CHARACTERS, ROOMS } from '../data/characters'
import type { RoomId } from '../data/types'
import { isRevealedTo } from '../data/reveal'
import { Badge } from '../components/Badge'

const CLUES: Record<RoomId, { title: string; text: string }[]> = {
  library: [
    { title: '졸업앨범', text: '한소율의 페이지만 유독 다른 종이 재질로 다시 인쇄되어 있다.' },
    { title: '옛 학교신문 스크랩', text: '"자퇴 처리" 기사 옆에 누군가 손으로 물음표를 세 개 그려두었다.' },
  ],
  infirmary: [
    { title: '방문 기록부', text: '실종 당일 오후 4시 12분, 한소율의 이름 옆에 진료 사유가 지워져 있다.' },
    { title: '상비약 캐비닛', text: '자물쇠가 새것으로 교체된 흔적. 3년 전엔 없던 것.' },
  ],
  broadcast: [
    { title: '송출 로그', text: '오늘 밤 방송은 이미 폐기된 3년 전 장비 채널에서 흘러나오고 있다.' },
    { title: '녹음 테이프', text: '사건 당일 저녁 방송 사고 시점의 테이프 라벨이 찢겨 있다.' },
  ],
  rooftop: [
    { title: '난간의 흠집', text: '난간 한쪽에 긁힌 자국과 색이 바랜 리본 조각이 묶여 있다.' },
    { title: '마지막 목격 지점', text: '이곳에서 한소율을 마지막으로 봤다는 진술이 세 사람분 남아 있다.' },
  ],
}

export function RoomsScreen() {
  const { viewerId, gmReveal, roomOccupancy, joinRoom, leaveRoom } = useGame()
  const [openRoom, setOpenRoom] = useState<RoomId | null>(null)
  const viewer = CHARACTERS.find((c) => c.id === viewerId)!

  function charOf(id: string) {
    return CHARACTERS.find((c) => c.id === id)!
  }

  if (openRoom) {
    const room = ROOMS.find((r) => r.id === openRoom)!
    const occupants = roomOccupancy[openRoom]
    const iAmHere = occupants.includes(viewerId)
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
                  <span>{c.name}</span>
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
          <span className="rooms__section-label">발견한 단서</span>
          <div className="rooms__clues">
            {CLUES[openRoom].map((clue) => (
              <div key={clue.title} className="rooms__clue">
                <span className="rooms__clue-title">{clue.title}</span>
                <p className="rooms__clue-text">{clue.text}</p>
              </div>
            ))}
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
      </div>
      <div className="rooms__grid">
        {ROOMS.map((room) => {
          const occupants = roomOccupancy[room.id]
          const full = occupants.length >= room.capacity
          return (
            <button key={room.id} className="rooms__card" onClick={() => setOpenRoom(room.id)}>
              <div className="rooms__card-top">
                <span className="rooms__card-name">{room.name}</span>
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
