import { useEffect, useState } from 'react'

export type MascotMood = 'idle' | 'happy' | 'excited' | 'sad'

const SPEECH: Record<MascotMood, string[]> = {
  idle: ['같이 해볼까?', '준비됐어!', '박자 타봐~'],
  happy: ['좋아좋아!', '이 느낌이야!', '나이스!'],
  excited: ['완벽해!!', '최고다!!', '불타오르네!'],
  sad: ['괜찮아, 다시!', '아쉽다…', '집중집중!'],
}

/** 헤드폰을 쓴 로봇 마스코트. 특정 상용 리듬게임의 실제 캐릭터(로고 포함
 * 디자인)를 그대로 베낀 게 아니라, "헤드폰 쓴 화이트/블루/옐로 로봇"이라는
 * 분위기만 오마주해서 새로 그린 오리지널 디자인이다. 평소에는 계속 고개를
 * 까딱까딱 흔들고, bump가 바뀔 때마다(히트/미스) 한 번씩 크게 끄덕인다. */
export default function Mascot({ mood, bump }: { mood: MascotMood; bump: number }) {
  const [nodBump, setNodBump] = useState(false)
  const [line, setLine] = useState(SPEECH.idle[0])

  useEffect(() => {
    setNodBump(true)
    setLine(SPEECH[mood][Math.floor(Math.random() * SPEECH[mood].length)])
    const t = setTimeout(() => setNodBump(false), 320)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump, mood])

  const eyes = EYES[mood]
  const mouth = MOUTHS[mood]

  return (
    <div className={`mascot mascot-${mood}`}>
      <div className="mascot-bubble">{line}</div>
      <svg viewBox="0 0 200 230" className="mascot-svg" aria-hidden="true">
        {mood === 'excited' && (
          <g className="mascot-sparkles">
            <circle cx="20" cy="50" r="5" />
            <circle cx="180" cy="70" r="4" />
            <circle cx="24" cy="140" r="3.5" />
            <circle cx="176" cy="150" r="5" />
          </g>
        )}

        {/* 다리/발 */}
        <rect x="72" y="196" width="20" height="20" rx="6" className="mascot-leg" />
        <rect x="108" y="196" width="20" height="20" rx="6" className="mascot-leg" />
        <ellipse cx="82" cy="220" rx="20" ry="8" className="mascot-foot" />
        <ellipse cx="118" cy="220" rx="20" ry="8" className="mascot-foot" />

        {/* 몸통 */}
        <rect x="62" y="150" width="76" height="52" rx="18" className="mascot-torso" />
        <rect x="72" y="160" width="56" height="14" rx="7" className="mascot-torso-stripe" />
        <circle cx="100" cy="188" r="7" className="mascot-torso-dot" />

        {/* 고개(까딱까딱 흔들리는 부분) */}
        <g className={`mascot-head-group ${nodBump ? 'mascot-head-bump' : ''}`}>
          <line x1="100" y1="130" x2="100" y2="150" className="mascot-neck" />

          {/* 헤드폰 밴드 + 이어컵 */}
          <path d="M 38 90 Q 100 22 162 90" className="mascot-headband" />
          <rect x="24" y="80" width="26" height="42" rx="13" className="mascot-earcup" />
          <rect x="150" y="80" width="26" height="42" rx="13" className="mascot-earcup" />
          <circle cx="37" cy="101" r="5" className="mascot-earcup-tip" />
          <circle cx="163" cy="101" r="5" className="mascot-earcup-tip" />

          {/* 머리 */}
          <rect x="46" y="52" width="108" height="88" rx="34" className="mascot-head" />
          <path d="M 92 30 L 100 12 L 108 30 Z" className="mascot-antenna-fin" />

          {/* 얼굴 바이저 */}
          <rect x="62" y="88" width="76" height="34" rx="14" className="mascot-visor" />
          {eyes}
          {mouth}

          <ellipse cx="76" cy="70" rx="16" ry="10" className="mascot-shine" />
        </g>
      </svg>
    </div>
  )
}

const EYES: Record<MascotMood, React.ReactNode> = {
  idle: (
    <g className="mascot-eyes">
      <circle cx="84" cy="105" r="7" className="mascot-eye" />
      <circle cx="116" cy="105" r="7" className="mascot-eye" />
    </g>
  ),
  happy: (
    <g className="mascot-eyes">
      <path d="M 76 108 Q 84 96 92 108" className="mascot-eye-arc" />
      <path d="M 108 108 Q 116 96 124 108" className="mascot-eye-arc" />
    </g>
  ),
  excited: (
    <g className="mascot-eyes">
      <circle cx="84" cy="105" r="9" className="mascot-eye mascot-eye-glow" />
      <circle cx="116" cy="105" r="9" className="mascot-eye mascot-eye-glow" />
    </g>
  ),
  sad: (
    <g className="mascot-eyes">
      <path d="M 77 100 L 91 106" className="mascot-eye-line" />
      <path d="M 123 100 L 109 106" className="mascot-eye-line" />
      <circle cx="84" cy="110" r="5" className="mascot-eye mascot-eye-dim" />
      <circle cx="116" cy="110" r="5" className="mascot-eye mascot-eye-dim" />
    </g>
  ),
}

const MOUTHS: Record<MascotMood, React.ReactNode> = {
  idle: <rect x="92" y="114" width="16" height="4" rx="2" className="mascot-mouth" />,
  happy: <path d="M 90 112 Q 100 120 110 112" className="mascot-mouth-arc" />,
  excited: <rect x="88" y="111" width="24" height="8" rx="4" className="mascot-mouth mascot-mouth-open" />,
  sad: <path d="M 90 118 Q 100 111 110 118" className="mascot-mouth-arc" />,
}
