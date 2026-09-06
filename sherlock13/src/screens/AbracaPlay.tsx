import { SPELL_MAP } from '../engine/abracawhat'
import type { SpellId } from '../engine/abracawhat'
import type { AbracaHandDoc, AbracaRole, AbracaRoomDoc } from '../engine/abracaTypes'

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
  room,
  myRole,
  opponentHand,
  resultFlash,
  busy,
  errorMsg,
  onDeclare,
}: {
  room: AbracaRoomDoc
  myRole: AbracaRole
  opponentHand: AbracaHandDoc | null
  resultFlash: { success: boolean; spellName: string; declarerName: string } | null
  busy: boolean
  errorMsg: string
  onDeclare: (spellId: SpellId) => void
}) {
  const oppRole: AbracaRole = myRole === 'host' ? 'guest' : 'host'
  const me = room[myRole]
  const opp = room[oppRole]
  const myTurn = room.currentPlayer === myRole
  const maxHp = Math.max(me.hp, opp.hp, 1)

  const oppRevealed = opponentHand ? (Object.entries(opponentHand.remaining) as [SpellId, number][]).filter(([, n]) => n > 0) : []

  const myDeclares = room.declareLog.filter((e) => e.by === myRole)
  const knownMine = [...new Set(myDeclares.filter((e) => e.success).map((e) => e.spellId))]
  const failedMine = [...new Set(myDeclares.filter((e) => !e.success).map((e) => e.spellId))]

  const waitingForResolve = room.pendingDeclare !== null

  return (
    <div className="abraca-theme abraca-play">
      <div className="abraca-hp-row">
        <div className={`abraca-hp-chip${myTurn ? ' turn' : ''}`}>
          <span className="abraca-hp-name">{me.name}(나)</span>
          <Hearts hp={me.hp} max={maxHp} />
        </div>
        <div className={`abraca-hp-chip${!myTurn ? ' turn' : ''}`}>
          <span className="abraca-hp-name">{opp.name}</span>
          <Hearts hp={opp.hp} max={maxHp} />
        </div>
      </div>

      <p className="abraca-turn-label">
        {myTurn ? '🔮 나의 차례' : `⏳ ${opp.name}의 차례를 기다리는 중…`}
      </p>

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
          {Array.from({ length: me.hiddenCount }).map((_, i) => (
            <div key={i} className="abraca-tile hidden">
              <span className="abraca-tile-icon">?</span>
            </div>
          ))}
        </div>
      </section>

      {(knownMine.length > 0 || failedMine.length > 0) && (
        <section className="abraca-memo">
          {knownMine.length > 0 && (
            <p className="abraca-memo-line">
              <span className="abraca-memo-label ok">확인된 마법</span>
              {knownMine.map((id) => (
                <span key={id} className="abraca-memo-chip ok">
                  {SPELL_MAP[id].name} ✓
                </span>
              ))}
            </p>
          )}
          {failedMine.length > 0 && (
            <p className="abraca-memo-line">
              <span className="abraca-memo-label bad">실패한 추리</span>
              {failedMine.map((id) => (
                <span key={id} className="abraca-memo-chip bad">
                  {SPELL_MAP[id].name} ✕
                </span>
              ))}
            </p>
          )}
        </section>
      )}

      {errorMsg && <p className="abraca-error">{errorMsg}</p>}

      <div className="abraca-log">
        {room.log
          .slice(-4)
          .reverse()
          .map((entry, i) => (
            <p key={`${entry.at}-${i}`} className="abraca-log-line">
              {entry.text}
            </p>
          ))}
      </div>

      <div className="abraca-declare-grid">
        {myTurn && !waitingForResolve ? (
          <>
            <p className="abraca-declare-hint">어떤 마법을 사용할까요?</p>
            <div className="abraca-declare-buttons">
              {room.activeSpellIds.map((id) => (
                <button type="button" key={id} className="abraca-declare-btn" disabled={busy || Boolean(resultFlash)} onClick={() => onDeclare(id)}>
                  <span className="abraca-declare-icon">{SPELL_MAP[id].icon}</span>
                  {SPELL_MAP[id].name}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="abraca-declare-hint">{waitingForResolve ? '판정 중…' : `${opp.name}의 차례를 기다리고 있어요…`}</p>
        )}
      </div>

      {resultFlash && (
        <div className={`abraca-flash-overlay${resultFlash.success ? ' success' : ' fail'}`}>
          <div className="abraca-flash-card">
            <span className="abraca-flash-icon">{resultFlash.success ? '✨' : '💥'}</span>
            <p className="abraca-flash-title">{resultFlash.success ? '마법 성공!' : '마법 실패!'}</p>
            <p className="abraca-flash-desc">
              {resultFlash.success
                ? `${resultFlash.declarerName}이(가) "${resultFlash.spellName}" 마법을 사용했습니다. 상대에게 피해를 입혔습니다!`
                : `${resultFlash.declarerName}의 "${resultFlash.spellName}" 마법은 그 사람의 마법이 아니었습니다. 체력 -1`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
