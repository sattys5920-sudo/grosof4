import { useState } from 'react'

export default function NicknameScreen({ initialNickname, onSubmit }: { initialNickname: string; onSubmit: (nickname: string) => void }) {
  const [value, setValue] = useState(initialNickname)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <div className="start-screen">
      <div className="start-card">
        <h1 className="start-title">오투..잼있어?</h1>
        <p className="start-sub">닉네임을 입력하고 시작하세요.</p>

        <form onSubmit={handleSubmit}>
          <input
            className="nickname-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="닉네임"
            maxLength={12}
            autoFocus
          />
          <button type="submit" className="start-btn" disabled={!value.trim()}>
            시작하기
          </button>
        </form>
      </div>
    </div>
  )
}
