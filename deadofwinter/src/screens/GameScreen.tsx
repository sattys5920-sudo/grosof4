import type { RoomDoc } from '../engine/types'
import Board from '../components/Board'
import SurvivorCard from '../components/SurvivorCard'

/** STEP 4 범위: 라운드/턴 진행 + 보드 + 내 생존자 카드까지. 이동·공격·
 * 탐색 같은 실제 행동은 STEP 5~6에서 이 화면에 이어 붙인다. */
export default function GameScreen({
  room,
  myUid,
  busy,
  errorMsg,
  onEndTurn,
}: {
  room: RoomDoc
  myUid: string
  busy: boolean
  errorMsg: string
  onEndTurn: () => void
}) {
  const turnOrder = room.turnOrder ?? []
  const currentUid = room.currentPlayerIndex !== undefined ? turnOrder[room.currentPlayerIndex] : undefined
  const myTurn = currentUid === myUid
  const nameOf = (uid: string) => room.players.find((p) => p.uid === uid)?.name ?? '???'
  const mySurvivors = (room.survivors ?? []).filter((s) => s.ownerUid === myUid)

  return (
    <div className="game-screen">
      <div className="game-hud">
        <span className="hud-round">ROUND {room.round ?? 1}</span>
        <span className={`hud-phase phase-${room.roundPhase}`}>
          {room.roundPhase === 'colony' ? '콜로니 단계' : '플레이어 턴'}
        </span>
      </div>

      <div className="turn-track">
        {turnOrder.map((uid, i) => (
          <div key={uid} className={`turn-chip${uid === currentUid ? ' active' : ''}${uid === myUid ? ' mine' : ''}`}>
            <span className="turn-chip-order">{i + 1}</span>
            <span className="turn-chip-name">{nameOf(uid)}</span>
          </div>
        ))}
      </div>

      <Board />

      {mySurvivors.length > 0 && (
        <div className="my-survivors">
          <span className="panel-label">내 생존자</span>
          <div className="my-survivors-row">
            {mySurvivors.map((s, i) => (
              <SurvivorCard key={`${s.survivorId}-${i}`} instance={s} />
            ))}
          </div>
        </div>
      )}

      {room.roundPhase === 'turns' && (
        <div className="turn-panel">
          <p className="turn-status">
            {myTurn ? '🔎 당신의 차례입니다' : `${currentUid ? nameOf(currentUid) : '???'}의 차례를 기다리는 중…`}
          </p>
          <p className="turn-hint">이동·공격·탐색 같은 실제 행동은 다음 단계에서 이어서 구현됩니다.</p>
          {errorMsg && <p className="menu-error">{errorMsg}</p>}
          <button type="button" className="menu-btn primary" disabled={!myTurn || busy} onClick={onEndTurn}>
            턴 종료
          </button>
        </div>
      )}

      {room.roundPhase === 'colony' && (
        <div className="turn-panel">
          <p className="turn-status">🏕 전원의 턴이 끝났습니다.</p>
          <p className="turn-hint">식량 지불 · 폐기물 확인 · 위기 해결 · 좀비 추가 등 콜로니 단계는 다음 단계에서 구현됩니다.</p>
        </div>
      )}

      <div className="game-log">
        {(room.log ?? [])
          .slice(-10)
          .reverse()
          .map((entry, i) => (
            // 같은 밀리초에 로그가 두 개 이상 쌓일 수 있어 entry.at만으로는
            // 키가 겹칠 수 있다 — 잘라낸 목록 안에서의 위치를 더해 유일하게 만든다.
            <p key={`${entry.at}-${i}`} className="game-log-entry">
              {entry.text}
            </p>
          ))}
      </div>
    </div>
  )
}
