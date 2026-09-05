import { useState } from 'react'

export default function Lobby({ code, onCancel }: { code: string; onCancel: () => void }) {
  const [copied, setCopied] = useState(false)
  const shareUrl = `${location.origin}${location.pathname}?room=${code}`

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // 클립보드 접근이 막혀 있으면 그냥 무시 — 코드는 화면에 이미 크게 보인다
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // no-op
    }
  }

  return (
    <div className="lobby-screen">
      <div className="lobby-emblem">🔍</div>
      <p className="lobby-eyebrow">CASE FILE OPENED</p>
      <p className="lobby-label">초대 코드</p>
      <button type="button" className="lobby-code" onClick={copyCode}>
        {code.split('').map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </button>
      {copied && <p className="lobby-copied">복사했어요!</p>}
      <p className="lobby-hint">이 코드를 친구에게 알려주세요. 상대가 입장하면 자동으로 시작됩니다.</p>
      <button type="button" className="menu-btn primary" onClick={copyLink}>
        초대 링크 복사하기
      </button>
      <div className="lobby-waiting">
        <span className="lobby-dot" />
        상대를 기다리는 중…
      </div>
      <button type="button" className="menu-btn ghost" onClick={onCancel}>
        취소하고 나가기
      </button>
    </div>
  )
}
