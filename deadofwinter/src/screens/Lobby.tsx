import { MAX_PLAYERS, type RoomDoc } from '../engine/types'
import { allReady } from '../engine/logic'

export default function Lobby({
  room,
  myUid,
  busy,
  errorMsg,
  onToggleReady,
  onStart,
  onLeave,
}: {
  room: RoomDoc
  myUid: string
  busy: boolean
  errorMsg: string
  onToggleReady: () => void
  onStart: () => void
  onLeave: () => void
}) {
  const isHost = room.hostUid === myUid
  const me = room.players.find((p) => p.uid === myUid)
  const slots = [...room.players]
  while (slots.length < MAX_PLAYERS) slots.push(null as never)
  const ready = allReady(room.players, MAX_PLAYERS)

  return (
    <div className="lobby-screen">
      <div className="lobby-emblem">🏕</div>
      <p className="lobby-eyebrow">CAMP ROSTER</p>
      <h2 className="lobby-title">초대 코드</h2>
      <div className="lobby-code">
        {room.code.split('').map((ch, i) => (
          <span key={i} className="lobby-code-letter">
            {ch}
          </span>
        ))}
      </div>
      <p className="lobby-hint">이 코드를 친구 3명에게 알려주세요. 4명이 모이면 방장이 시작할 수 있어요.</p>
      <button
        type="button"
        className="menu-btn ghost"
        onClick={() => {
          const url = `${window.location.origin}${window.location.pathname}?join=${room.code}`
          navigator.clipboard?.writeText(url).catch(() => {})
        }}
      >
        초대 링크 복사하기
      </button>

      <div className="lobby-slots">
        {slots.map((p, i) =>
          p ? (
            <div key={p.uid} className={`lobby-slot filled${p.ready ? ' ready' : ''}`}>
              <span className="lobby-slot-name">
                {p.name}
                {p.uid === room.hostUid && <span className="lobby-slot-host">방장</span>}
                {p.uid === myUid && <span className="lobby-slot-me">나</span>}
              </span>
              <span className="lobby-slot-status">{p.ready ? '준비 완료' : '준비 중…'}</span>
            </div>
          ) : (
            <div key={`empty-${i}`} className="lobby-slot empty">
              <span className="lobby-slot-name">빈 자리</span>
            </div>
          ),
        )}
      </div>

      {errorMsg && <p className="menu-error">{errorMsg}</p>}

      <div className="lobby-actions">
        <button type="button" className={`menu-btn primary${me?.ready ? ' active' : ''}`} disabled={busy} onClick={onToggleReady}>
          {me?.ready ? '준비 취소' : '준비 완료'}
        </button>
        {isHost && (
          <button type="button" className="menu-btn" disabled={busy || !ready} onClick={onStart}>
            {busy ? '시작하는 중…' : ready ? '게임 시작' : `전원 준비 대기 중 (${room.players.length}/${MAX_PLAYERS})`}
          </button>
        )}
        <button type="button" className="menu-btn ghost" disabled={busy} onClick={onLeave}>
          나가기
        </button>
      </div>
    </div>
  )
}
