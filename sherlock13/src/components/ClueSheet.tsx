import { useEffect, useState } from 'react'
import type { LastAnswer, Role, SuspectId } from '../engine/types'
import { SUSPECTS, SUSPECT_MAP, TRAITS } from '../engine/suspects'
import { countTrait, possibleCriminals } from '../engine/logic'

type NoteStatus = 'unknown' | 'cleared' | 'me' | 'opponent' | 'suspect'
const CYCLE: NoteStatus[] = ['unknown', 'cleared', 'me', 'opponent', 'suspect']
const NOTE_ICON: Record<NoteStatus, string> = { unknown: '❓', cleared: '✓', me: '👤', opponent: '👤', suspect: '☠' }
const NOTE_LABEL: Record<NoteStatus, string> = { unknown: '미확인', cleared: '무죄', me: '내 카드', opponent: '상대 카드', suspect: '범인 후보' }

function notesStorageKey(code: string, role: Role) {
  return `sherlock13:notes:${code}:${role}`
}

export default function ClueSheet({
  open,
  onClose,
  code,
  role,
  myHand,
  revealedCentralIds,
  answers,
}: {
  open: boolean
  onClose: () => void
  code: string
  role: Role
  myHand: SuspectId[]
  revealedCentralIds: SuspectId[]
  answers: LastAnswer[]
}) {
  const [notes, setNotes] = useState<Record<SuspectId, NoteStatus>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(notesStorageKey(code, role))
      if (raw) setNotes(JSON.parse(raw))
    } catch {
      // 저장된 메모가 없거나 깨졌으면 그냥 빈 상태로 시작
    }
  }, [code, role])

  function cycle(id: SuspectId) {
    setNotes((prev) => {
      const cur = prev[id] ?? 'unknown'
      const next = CYCLE[(CYCLE.indexOf(cur) + 1) % CYCLE.length]
      const updated = { ...prev, [id]: next }
      try {
        localStorage.setItem(notesStorageKey(code, role), JSON.stringify(updated))
      } catch {
        // 저장 실패해도 화면 상태는 그대로 유지
      }
      return updated
    })
  }

  const autoSafe = new Set<SuspectId>([...myHand, ...revealedCentralIds])
  const manuallyCleared = Object.entries(notes)
    .filter(([, v]) => v === 'cleared')
    .map(([id]) => id)
  const candidates = possibleCriminals(SUSPECTS, myHand, revealedCentralIds, manuallyCleared)

  const myAsksAboutOpponent = answers.filter((a) => a.askedBy === role)

  return (
    <div className={`sheet-backdrop${open ? ' open' : ''}`}>
      <div className="clue-sheet">
        <div className="clue-sheet-handle" />
        <div className="clue-sheet-header">
          <h2>수사 노트</h2>
          <button type="button" className="sheet-close" onClick={onClose}>
            닫기
          </button>
        </div>

        <section className="clue-section">
          <h3>가능한 범인 {candidates.length}명</h3>
          <div className="candidate-chips">
            {candidates.map((s) => (
              <span key={s.id} className="candidate-chip">
                {s.name}
              </span>
            ))}
            {candidates.length === 0 && <span className="candidate-empty">모든 용의자가 제외됐어요. 메모를 다시 확인해 보세요.</span>}
          </div>
        </section>

        <section className="clue-section">
          <h3>용의자 상태</h3>
          <p className="clue-note-hint">칸을 눌러 직접 표시를 바꿀 수 있어요 (미확인 → 무죄 → 내 카드 → 상대 카드 → 범인 후보)</p>
          <div className="suspect-status-list">
            {SUSPECTS.map((s) => {
              const locked = autoSafe.has(s.id)
              const status: NoteStatus = locked ? 'cleared' : (notes[s.id] ?? 'unknown')
              return (
                <button
                  type="button"
                  key={s.id}
                  className={`suspect-status-row status-${status}${locked ? ' locked' : ''}`}
                  onClick={() => !locked && cycle(s.id)}
                  disabled={locked}
                >
                  <span className="suspect-status-name">{s.name}</span>
                  <span className="suspect-status-badge">
                    {NOTE_ICON[status]} {NOTE_LABEL[status]}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="clue-section">
          <h3>특징별 정보</h3>
          <div className="trait-info-list">
            {TRAITS.map((t) => {
              const mine = countTrait(myHand, SUSPECT_MAP, t.id)
              const lastAsked = [...myAsksAboutOpponent].reverse().find((a) => a.trait === t.id)
              return (
                <div key={t.id} className="trait-info-row">
                  <span className="trait-info-icon">{t.icon}</span>
                  <span className="trait-info-label">{t.label}</span>
                  <span className="trait-info-value">나 {mine}</span>
                  <span className="trait-info-value">상대 {lastAsked ? lastAsked.count : '?'}</span>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
