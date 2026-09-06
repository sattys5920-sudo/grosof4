import type { AbracaState, SpellId } from '../engine/abracawhat'
import { SPELL_MAP } from '../engine/abracawhat'

function Hearts({ hp, max }: { hp: number; max: number }) {
  return (
    <span className="abraca-hearts">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`abraca-heart${i < hp ? '' : ' empty'}`}>
          {i < hp ? '♥' : '♡'}
        </span>
      ))}
    </span>
  )
}

export default function AbracaPlay({
  state,
  resultFlash,
  onDeclare,
}: {
  state: AbracaState
  resultFlash: { success: boolean; spellName: string } | null
  onDeclare: (spellId: SpellId) => void
}) {
  const meIdx = state.currentPlayerIndex
  const oppIdx = meIdx === 0 ? 1 : 0
  const me = state.players[meIdx]
  const opp = state.players[oppIdx]
  const maxHp = Math.max(...state.players.map((p) => p.hp), 1)

  const oppRevealed = (Object.entries(opp.remaining) as [SpellId, number][]).filter(([, n]) => n > 0)
  const myHiddenCount = (Object.values(me.remaining) as number[]).reduce((sum, n) => sum + n, 0)

  return (
    <div className="abraca-theme abraca-play">
      <div className="abraca-hp-row">
        <div className={`abraca-hp-chip${meIdx === 0 ? ' turn' : ''}`}>
          <span className="abraca-hp-name">{state.players[0].name}</span>
          <Hearts hp={state.players[0].hp} max={maxHp} />
        </div>
        <div className={`abraca-hp-chip${meIdx === 1 ? ' turn' : ''}`}>
          <span className="abraca-hp-name">{state.players[1].name}</span>
          <Hearts hp={state.players[1].hp} max={maxHp} />
        </div>
      </div>

      <p className="abraca-turn-label">🔮 {me.name}의 차례</p>

      <section className="abraca-section">
        <h3 className="abraca-section-title">상대의 마법 — {opp.name}</h3>
        <div className="abraca-tile-row">
          {oppRevealed.length === 0 && <span className="abraca-empty-hint">상대의 마법이 전부 소진됐어요.</span>}
          {oppRevealed.map(([id, n]) => (
            <div key={id} className="abraca-tile revealed">
              <span className="abraca-tile-icon">{SPELL_MAP[id].icon}</span>
              <span className="abraca-tile-name">{SPELL_MAP[id].name}</span>
              <span className="abraca-tile-count">×{n}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="abraca-section">
        <h3 className="abraca-section-title">내 마법 (나도 몰라요)</h3>
        <div className="abraca-tile-row">
          {Array.from({ length: myHiddenCount }).map((_, i) => (
            <div key={i} className="abraca-tile hidden">
              <span className="abraca-tile-icon">?</span>
            </div>
          ))}
        </div>
      </section>

      {(me.knownMine.length > 0 || me.failedMine.length > 0) && (
        <section className="abraca-memo">
          {me.knownMine.length > 0 && (
            <p className="abraca-memo-line">
              <span className="abraca-memo-label ok">확인된 마법</span>
              {me.knownMine.map((id) => (
                <span key={id} className="abraca-memo-chip ok">
                  {SPELL_MAP[id].name} ✓
                </span>
              ))}
            </p>
          )}
          {me.failedMine.length > 0 && (
            <p className="abraca-memo-line">
              <span className="abraca-memo-label bad">실패한 추리</span>
              {me.failedMine.map((id) => (
                <span key={id} className="abraca-memo-chip bad">
                  {SPELL_MAP[id].name} ✕
                </span>
              ))}
            </p>
          )}
        </section>
      )}

      <div className="abraca-log">
        {state.log
          .slice(-4)
          .reverse()
          .map((line, i) => (
            <p key={i} className="abraca-log-line">
              {line}
            </p>
          ))}
      </div>

      <div className="abraca-declare-grid">
        <p className="abraca-declare-hint">어떤 마법을 사용할까요?</p>
        <div className="abraca-declare-buttons">
          {state.activeSpellIds.map((id) => (
            <button type="button" key={id} className="abraca-declare-btn" disabled={Boolean(resultFlash)} onClick={() => onDeclare(id)}>
              <span className="abraca-declare-icon">{SPELL_MAP[id].icon}</span>
              {SPELL_MAP[id].name}
            </button>
          ))}
        </div>
      </div>

      {resultFlash && (
        <div className={`abraca-flash-overlay${resultFlash.success ? ' success' : ' fail'}`}>
          <div className="abraca-flash-card">
            <span className="abraca-flash-icon">{resultFlash.success ? '✨' : '💥'}</span>
            <p className="abraca-flash-title">{resultFlash.success ? '마법 성공!' : '마법 실패!'}</p>
            <p className="abraca-flash-desc">
              {resultFlash.success
                ? `"${resultFlash.spellName}" 마법을 사용했습니다. 상대에게 피해를 입혔습니다!`
                : `그 마법은 당신의 마법이 아니었습니다. 체력 -1`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
