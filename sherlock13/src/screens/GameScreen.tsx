import { useMemo, useState } from 'react'
import type { Role, RoomDoc, SuspectId, TraitId } from '../engine/types'
import { SUSPECTS, SUSPECT_MAP, TRAITS } from '../engine/suspects'
import { countTrait } from '../engine/logic'
import SuspectCard, { FaceDownCard } from '../components/SuspectCard'
import ClueSheet from '../components/ClueSheet'
import { askQuestion, exchangeCentral, accuse } from '../engine/room'

type Modal = null | 'question' | 'exchange-side' | 'exchange-give' | 'accuse'

export default function GameScreen({
  code,
  role,
  room,
  myHand,
  onHandChanged,
}: {
  code: string
  role: Role
  room: RoomDoc
  myHand: SuspectId[]
  onHandChanged: () => void
}) {
  const [modal, setModal] = useState<Modal>(null)
  const [exchangeSide, setExchangeSide] = useState<'left' | 'right' | null>(null)
  const [giveId, setGiveId] = useState<SuspectId | null>(null)
  const [accuseId, setAccuseId] = useState<SuspectId | null>(null)
  const [clueOpen, setClueOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const myTurn = room.currentPlayer === role && room.phase === 'playing'
  const canExchange = myTurn && room.exchangeCount < 2 && (room.central.leftId === null || room.central.rightId === null)

  const myHandSuspects = useMemo(() => myHand.map((id) => SUSPECT_MAP[id]).filter(Boolean), [myHand])
  const revealedCentralIds = useMemo(
    () => [room.central.leftId, room.central.rightId].filter((v): v is SuspectId => v !== null),
    [room.central.leftId, room.central.rightId],
  )

  function closeModals() {
    setModal(null)
    setExchangeSide(null)
    setGiveId(null)
    setAccuseId(null)
    setErrorMsg('')
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setErrorMsg('')
    try {
      await fn()
      closeModals()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '문제가 생겼어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleAsk(trait: TraitId, label: string) {
    const count = countTrait(myHand, SUSPECT_MAP, trait)
    await run(() => askQuestion(code, room, role, trait, label, count))
  }

  async function handleExchangeGive(id: SuspectId) {
    if (!exchangeSide) return
    setGiveId(id)
    await run(async () => {
      await exchangeCentral(code, room, role, exchangeSide, id)
      onHandChanged()
    })
  }

  async function handleAccuse() {
    if (!accuseId) return
    await run(() => accuse(code, room, role, accuseId))
  }

  return (
    <div className="game-screen">
      <div className="turn-header">
        <span className="turn-round">교환 {room.exchangeCount}/2</span>
        <span className={`turn-indicator${myTurn ? ' mine' : ''}`}>{myTurn ? '🔎 당신의 차례' : '상대의 차례'}</span>
        <button type="button" className="log-toggle" onClick={() => setClueOpen(true)}>
          📓 수사 노트
        </button>
      </div>

      <div className="opponent-area">
        <span className="opponent-label">OPPONENT</span>
        <div className="opponent-cards">
          {Array.from({ length: 5 }).map((_, i) => (
            <FaceDownCard key={i} size="sm" />
          ))}
        </div>
      </div>

      <div className="central-area">
        <p className="central-label">CENTRAL CASE</p>
        <div className="central-cards">
          {room.central.leftId ? <SuspectCard suspect={SUSPECT_MAP[room.central.leftId]} size="sm" /> : <FaceDownCard size="sm" />}
          <FaceDownCard size="sm" label="범인" />
          {room.central.rightId ? <SuspectCard suspect={SUSPECT_MAP[room.central.rightId]} size="sm" /> : <FaceDownCard size="sm" />}
        </div>
      </div>

      {room.log.length > 0 && (
        <div className="mini-log">
          {room.log
            .slice(-2)
            .reverse()
            .map((e, i) => (
              <div key={i} className="mini-log-entry">
                {e.text}
              </div>
            ))}
        </div>
      )}

      <div className="my-hand-area">
        <span className="my-hand-label">MY HAND</span>
        <div className="my-hand-row">
          {myHandSuspects.map((s) => (
            <SuspectCard key={s.id} suspect={s} size="sm" />
          ))}
        </div>
      </div>

      <div className="action-bar">
        <button type="button" className="action-btn" disabled={!myTurn} onClick={() => setModal('question')}>
          🔎<span>질문</span>
        </button>
        <button type="button" className="action-btn" disabled={!canExchange} onClick={() => setModal('exchange-side')}>
          🔄<span>교환</span>
        </button>
        <button type="button" className="action-btn danger" disabled={!myTurn} onClick={() => setModal('accuse')}>
          ☠<span>고발</span>
        </button>
      </div>

      {!myTurn && <p className="wait-hint">상대의 행동을 기다리고 있어요…</p>}

      {/* 질문 모달 */}
      {modal === 'question' && (
        <div className="sheet-backdrop open">
          <div className="action-sheet">
            <h2>어떤 특징을 질문할까요?</h2>
            <p className="sheet-sub">상대가 가진 5장 중 몇 명이 그 특징을 가졌는지 정확한 숫자로 답합니다.</p>
            {errorMsg && <p className="sheet-error">{errorMsg}</p>}
            <div className="trait-pick-grid">
              {TRAITS.map((t) => (
                <button key={t.id} type="button" className="trait-pick-btn" disabled={busy} onClick={() => handleAsk(t.id, t.label)}>
                  <span className="trait-pick-icon">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <button type="button" className="menu-btn ghost" onClick={closeModals} disabled={busy}>
              취소
            </button>
          </div>
        </div>
      )}

      {/* 교환 - 쪽 선택 */}
      {modal === 'exchange-side' && (
        <div className="sheet-backdrop open">
          <div className="action-sheet">
            <h2>어느 쪽 카드를 가져올까요?</h2>
            <p className="sheet-sub">중앙 범인 카드 양옆의 카드만 교환할 수 있어요. 최대 2번.</p>
            <div className="exchange-side-picker">
              <button
                type="button"
                className="side-pick-btn"
                disabled={room.central.leftId !== null}
                onClick={() => {
                  setExchangeSide('left')
                  setModal('exchange-give')
                }}
              >
                왼쪽 카드
              </button>
              <button
                type="button"
                className="side-pick-btn"
                disabled={room.central.rightId !== null}
                onClick={() => {
                  setExchangeSide('right')
                  setModal('exchange-give')
                }}
              >
                오른쪽 카드
              </button>
            </div>
            <button type="button" className="menu-btn ghost" onClick={closeModals}>
              취소
            </button>
          </div>
        </div>
      )}

      {/* 교환 - 내 카드 선택 */}
      {modal === 'exchange-give' && (
        <div className="sheet-backdrop open">
          <div className="action-sheet">
            <h2>대신 내려놓을 카드를 고르세요</h2>
            <p className="sheet-sub">선택한 카드는 앞면으로 공개됩니다.</p>
            {errorMsg && <p className="sheet-error">{errorMsg}</p>}
            <div className="give-grid">
              {myHandSuspects.map((s) => (
                <SuspectCard key={s.id} suspect={s} size="sm" selected={giveId === s.id} onClick={() => !busy && handleExchangeGive(s.id)} />
              ))}
            </div>
            <button type="button" className="menu-btn ghost" onClick={closeModals} disabled={busy}>
              취소
            </button>
          </div>
        </div>
      )}

      {/* 고발 */}
      {modal === 'accuse' && (
        <div className="sheet-backdrop open">
          <div className="action-sheet">
            <h2>범인을 고발하시겠습니까?</h2>
            <p className="sheet-sub accuse-warn">고발은 딱 한 번만 가능하고, 틀리면 즉시 게임에서 집니다.</p>
            {errorMsg && <p className="sheet-error">{errorMsg}</p>}
            <div className="accuse-grid">
              {SUSPECTS.map((s) => (
                <SuspectCard key={s.id} suspect={s} size="sm" selected={accuseId === s.id} onClick={() => setAccuseId(s.id)} />
              ))}
            </div>
            <div className="sheet-actions">
              <button type="button" className="menu-btn ghost" onClick={closeModals} disabled={busy}>
                취소
              </button>
              <button type="button" className="menu-btn danger" disabled={!accuseId || busy} onClick={handleAccuse}>
                {busy ? '고발하는 중…' : '고발하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ClueSheet
        open={clueOpen}
        onClose={() => setClueOpen(false)}
        code={code}
        role={role}
        myHand={myHand}
        revealedCentralIds={revealedCentralIds}
        answers={room.answers}
      />
    </div>
  )
}
