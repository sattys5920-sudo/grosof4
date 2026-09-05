import { useState } from 'react'

export default function MainMenu({
  busy,
  errorMsg,
  initialCode,
  onCreate,
  onJoin,
}: {
  busy: boolean
  errorMsg: string
  initialCode?: string
  onCreate: (name: string) => void
  onJoin: (code: string, name: string) => void
}) {
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'idle' | 'join'>(initialCode ? 'join' : 'idle')
  const [code, setCode] = useState(initialCode ?? '')

  return (
    <div className="menu-screen">
      <div className="menu-emblem">❄️</div>
      <h1 className="menu-title">
        DEAD OF
        <br />
        WINTER
      </h1>
      <p className="menu-sub">A COLONY SURVIVAL GAME</p>
      <p className="menu-desc">4명이 함께 콜로니를 지키세요. 협력해야 살아남지만, 누군가는 배신자일지 모릅니다.</p>

      <input
        className="menu-input"
        type="text"
        placeholder="이름 (예: 김철수)"
        value={name}
        maxLength={12}
        onChange={(e) => setName(e.target.value)}
      />

      {errorMsg && <p className="menu-error">{errorMsg}</p>}

      {mode === 'idle' && (
        <div className="menu-actions">
          <button type="button" className="menu-btn primary" disabled={busy} onClick={() => onCreate(name)}>
            {busy ? '방 만드는 중…' : '새 게임 만들기'}
          </button>
          <button type="button" className="menu-btn" disabled={busy} onClick={() => setMode('join')}>
            초대 코드로 입장하기
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="menu-actions">
          <input
            className="menu-input code-input"
            type="text"
            placeholder="초대 코드"
            value={code}
            maxLength={4}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button
            type="button"
            className="menu-btn primary"
            disabled={busy || code.trim().length !== 4}
            onClick={() => onJoin(code, name)}
          >
            {busy ? '입장하는 중…' : '입장하기'}
          </button>
          <button type="button" className="menu-btn ghost" disabled={busy} onClick={() => setMode('idle')}>
            뒤로
          </button>
        </div>
      )}

      <p className="menu-footnote">4인 전용 · 로그인 없이 이름과 코드만으로 입장</p>
    </div>
  )
}
