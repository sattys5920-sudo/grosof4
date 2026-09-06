import type { AbracaState } from '../engine/abracawhat'

/** 턴 전환 화면. 게임 데이터를 절대 그리지 않는다 — 이전 사람이 방금
 * 확인한 정보가 화면에 남아있으면 다음 사람에게 그대로 보이므로, 이
 * 컴포넌트가 떠 있는 동안은 마법·체력 같은 게임 상태를 아예 렌더링하지
 * 않는 것 자체가 치팅 방지 장치다. */
export default function AbracaHandoff({ state, onConfirm }: { state: AbracaState; onConfirm: () => void }) {
  const prevIdx = state.currentPlayerIndex
  const nextIdx = state.pendingTurnIndex ?? state.currentPlayerIndex
  const prevName = state.players[prevIdx].name
  const nextName = state.players[nextIdx].name

  return (
    <div className="abraca-theme abraca-handoff">
      <div className="abraca-handoff-card">
        <p className="abraca-handoff-done">{prevName}의 턴 종료</p>
        <div className="abraca-handoff-divider" />
        <p className="abraca-handoff-instruction">기기를 {nextName}에게 넘겨주세요.</p>
        <button type="button" className="abraca-btn primary abraca-handoff-btn" onClick={onConfirm}>
          {nextName} 시작
        </button>
      </div>
    </div>
  )
}
