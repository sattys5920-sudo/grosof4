import { useState } from 'react'

export default function AbracaLobby({ code, onCancel }: { code: string; onCancel: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // 클립보드 접근이 막혀 있으면 그냥 무시 — 코드는 화면에 이미 크게 보인다
    }
  }

  return (
    <div className="abraca-theme abraca-lobby">
      <div className="abraca-emblem">🪄</div>
      <p className="abraca-tagline">초대 코드</p>
      <button type="button" className="abraca-code-display" onClick={copyCode}>
        {code.split('').map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </button>
      {copied && <p className="abraca-copied">복사했어요!</p>}
      <p className="abraca-lobby-hint">이 코드를 친구에게 알려주세요. 상대가 입장하면 자동으로 시작됩니다.</p>
      <div className="abraca-lobby-waiting">
        <span className="abraca-lobby-dot" />
        상대를 기다리는 중…
      </div>
      <button type="button" className="abraca-btn ghost" onClick={onCancel}>
        취소하고 나가기
      </button>
    </div>
  )
}
