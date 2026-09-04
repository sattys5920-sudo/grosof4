import { useEffect, useState } from 'react'

export type MascotMood = 'idle' | 'happy' | 'excited' | 'sad'

const SPEECH: Record<MascotMood, string[]> = {
  idle: ['같이 해볼까?', '준비됐어!', '박자 타봐~'],
  happy: ['좋아좋아!', '이 느낌이야!', '나이스!'],
  excited: ['완벽해!!', '최고다!!', '불타오르네!'],
  sad: ['괜찮아, 다시!', '아쉽다…', '집중집중!'],
}

/** 오투잼 느낌의 물방울 마스코트. 실제 게임 캐릭터를 베낀 게 아니라
 * "노트 옆에서 리액션하는 동글동글한 버블 캐릭터"라는 느낌만 오마주해서
 * 새로 그린 오리지널 디자인이다. bump가 바뀔 때마다 한 번씩 통통 튄다. */
export default function Mascot({ mood, bump }: { mood: MascotMood; bump: number }) {
  const [jump, setJump] = useState(false)
  const [line, setLine] = useState(SPEECH.idle[0])

  useEffect(() => {
    setJump(true)
    setLine(SPEECH[mood][Math.floor(Math.random() * SPEECH[mood].length)])
    const t = setTimeout(() => setJump(false), 360)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump, mood])

  const face = FACES[mood]

  return (
    <div className={`mascot mascot-${mood} ${jump ? 'mascot-jump' : ''}`}>
      <div className="mascot-bubble">{line}</div>
      <svg viewBox="0 0 200 200" className="mascot-svg" aria-hidden="true">
        {mood === 'excited' && (
          <g className="mascot-sparkles">
            <circle cx="24" cy="40" r="5" />
            <circle cx="176" cy="60" r="4" />
            <circle cx="30" cy="150" r="3.5" />
            <circle cx="172" cy="140" r="5" />
          </g>
        )}
        <ellipse cx="70" cy="176" rx="18" ry="9" className="mascot-foot" />
        <ellipse cx="130" cy="176" rx="18" ry="9" className="mascot-foot" />
        <ellipse cx="100" cy="106" rx="78" ry="72" className="mascot-body" />
        <ellipse cx="70" cy="76" rx="22" ry="16" className="mascot-shine" />
        <circle cx="40" cy="128" r="14" className="mascot-cheek" />
        <circle cx="160" cy="128" r="14" className="mascot-cheek" />
        {face}
        <circle cx="100" cy="18" r="9" className="mascot-antenna-ball" />
        <line x1="100" y1="26" x2="100" y2="46" className="mascot-antenna-line" />
      </svg>
    </div>
  )
}

const FACES: Record<MascotMood, React.ReactNode> = {
  idle: (
    <g className="mascot-face">
      <ellipse cx="72" cy="100" rx="10" ry="13" className="mascot-eye" />
      <ellipse cx="128" cy="100" rx="10" ry="13" className="mascot-eye" />
      <path d="M 78 132 Q 100 148 122 132" className="mascot-mouth" />
    </g>
  ),
  happy: (
    <g className="mascot-face">
      <path d="M 60 100 Q 72 84 84 100" className="mascot-eye-arc" />
      <path d="M 116 100 Q 128 84 140 100" className="mascot-eye-arc" />
      <path d="M 74 128 Q 100 156 126 128" className="mascot-mouth" />
    </g>
  ),
  excited: (
    <g className="mascot-face">
      <circle cx="72" cy="100" r="13" className="mascot-eye" />
      <circle cx="128" cy="100" r="13" className="mascot-eye" />
      <ellipse cx="100" cy="136" rx="14" ry="16" className="mascot-mouth-open" />
    </g>
  ),
  sad: (
    <g className="mascot-face">
      <path d="M 62 106 L 82 96" className="mascot-eye-line" />
      <path d="M 138 106 L 118 96" className="mascot-eye-line" />
      <circle cx="70" cy="112" r="9" className="mascot-eye" />
      <circle cx="130" cy="112" r="9" className="mascot-eye" />
      <ellipse cx="62" cy="128" rx="4" ry="7" className="mascot-tear" />
      <path d="M 78 140 Q 100 126 122 140" className="mascot-mouth" />
    </g>
  ),
}
