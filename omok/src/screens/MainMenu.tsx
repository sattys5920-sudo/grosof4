import { useState } from 'react'

export default function MainMenu({
  onCreate,
  onJoin,
  busy,
  errorMsg,
}: {
  onCreate: (name: string) => void
  onJoin: (name: string, code: string) => void
  busy: boolean
  errorMsg: string
}) {
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  return (
    <div className="menu-screen">
      <div className="menu-emblem">⚫⚪</div>
      <h1 className="menu-title">오목</h1>
      <p className="menu-sub">쌍삼 금지 · 60초 제한</p>

      {errorMsg && <p className="menu-error">{errorMsg}</p>}

      {mode === 'idle' && (
        <div className="menu-actions">
          <button type="button" className="menu-btn primary" disabled={busy} onClick={() => setMode('create')}>
            방 만들기 (흑, 선공)
          </button>
          <button type="button" className="menu-btn" disabled={busy} onClick={() => setMode('join')}>
            초대 코드로 입장하기 (백)
          </button>
        </div>
      )}

      {mode === 'create' && (
        <div className="menu-actions">
          <input
            className="menu-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="내 이름"
            maxLength={12}
            autoFocus
          />
          <button type="button" className="menu-btn primary" disabled={busy} onClick={() => onCreate(name)}>
            {busy ? '방 만드는 중…' : '방 만들기'}
          </button>
          <button type="button" className="menu-btn ghost" disabled={busy} onClick={() => setMode('idle')}>
            뒤로
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="menu-actions">
          <input
            className="menu-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="내 이름"
            maxLength={12}
            autoFocus
          />
          <input
            className="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="초대 코드 4자리"
            maxLength={6}
          />
          <button type="button" className="menu-btn primary" disabled={busy || code.trim().length === 0} onClick={() => onJoin(name, code)}>
            {busy ? '입장하는 중…' : '입장하기'}
          </button>
          <button type="button" className="menu-btn ghost" disabled={busy} onClick={() => setMode('idle')}>
            뒤로
          </button>
        </div>
      )}

      <p className="menu-footer">2인 전용 · 방장이 흑(선공), 상대가 백 · 한 수당 60초</p>
    </div>
  )
}
