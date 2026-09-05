import { useState } from 'react'

export default function MainMenu({
  onCreate,
  onJoin,
  busy,
  errorMsg,
}: {
  onCreate: () => void
  onJoin: (code: string) => void
  busy: boolean
  errorMsg: string
}) {
  const [mode, setMode] = useState<'idle' | 'join'>('idle')
  const [code, setCode] = useState('')

  return (
    <div className="menu-screen">
      <div className="menu-emblem">🔍</div>
      <h1 className="menu-title">
        SHERLOCK
        <br />
        13
      </h1>
      <p className="menu-sub">THE HIDDEN THIEF</p>
      <p className="menu-desc">민지♡해린</p>

      {errorMsg && <p className="menu-error">{errorMsg}</p>}

      {mode === 'idle' && (
        <div className="menu-actions">
          <button type="button" className="menu-btn primary" disabled={busy} onClick={onCreate}>
            {busy ? '방 만드는 중…' : '게임 시작 · 방 만들기'}
          </button>
          <button type="button" className="menu-btn" disabled={busy} onClick={() => setMode('join')}>
            초대 코드로 입장하기
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="menu-actions">
          <input
            className="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="초대 코드 4자리"
            maxLength={6}
            autoFocus
          />
          <button type="button" className="menu-btn primary" disabled={busy || code.trim().length === 0} onClick={() => onJoin(code)}>
            {busy ? '입장하는 중…' : '입장하기'}
          </button>
          <button type="button" className="menu-btn ghost" disabled={busy} onClick={() => setMode('idle')}>
            뒤로
          </button>
        </div>
      )}

      <p className="menu-footer">2인 전용 · 로그인 없이 코드만으로 입장</p>
    </div>
  )
}
