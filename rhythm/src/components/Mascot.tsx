import { useEffect, useState } from 'react'

export type MascotMood = 'idle' | 'happy' | 'excited' | 'sad'

const SPEECH: Record<MascotMood, string[]> = {
  idle: ['같이 해볼까?', '준비됐어!', '박자 타봐~'],
  happy: ['좋아좋아!', '이 느낌이야!', '나이스!'],
  excited: ['완벽해!!', '최고다!!', '불타오르네!'],
  sad: ['괜찮아, 다시!', '아쉽다…', '집중집중!'],
}

/** 화이트/블루/옐로 톤의 라운드 로봇 마스코트.
 * 사용자가 보내준 참고 이미지는 실제 상용 리듬게임의 저작권 있는 캐릭터라
 * 로고·구체적 조형을 그대로 베끼진 않았지만, 그 캐릭터의 전체적인 실루엣과
 * 색 배치(둥근 흰 몸체, 검은 바이저, 위쪽 뿔 모양 스파이크+안테나, 옆면
 * 귀 모양 돌기, 아래쪽 파란 투톤, 동그란 손)는 최대한 가깝게 새로 그린
 * 오리지널 디자인이다. 평소에는 고개를 계속 까딱까딱 흔들고, bump가 바뀔
 * 때마다(히트/미스) 한 번씩 크게 끄덕인다. */
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
      <svg viewBox="0 0 200 240" className="mascot-svg" aria-hidden="true">
        {mood === 'excited' && (
          <g className="mascot-sparkles">
            <circle cx="16" cy="60" r="5" />
            <circle cx="184" cy="80" r="4" />
            <circle cx="20" cy="150" r="3.5" />
            <circle cx="180" cy="160" r="5" />
          </g>
        )}

        {/* 다리/발 (고개 흔들 때도 가만히 있는 부분) */}
        <rect x="72" y="204" width="20" height="18" rx="6" className="mascot-leg" />
        <rect x="108" y="204" width="20" height="18" rx="6" className="mascot-leg" />
        <ellipse cx="82" cy="226" rx="20" ry="8" className="mascot-foot" />
        <ellipse cx="118" cy="226" rx="20" ry="8" className="mascot-foot" />

        {/* 몸통 + 머리 (까딱까딱 흔들리는 부분) */}
        <g className={`mascot-head-group ${nodBump ? 'mascot-head-bump' : ''}`}>
          {/* 팔 + 손 */}
          <rect x="34" y="146" width="26" height="16" rx="8" className="mascot-arm" />
          <rect x="140" y="146" width="26" height="16" rx="8" className="mascot-arm" />
          <circle cx="32" cy="156" r="12" className="mascot-hand" />
          <circle cx="168" cy="156" r="12" className="mascot-hand" />

          {/* 몸통 + 아래쪽 파란 투톤 */}
          <rect x="56" y="128" width="88" height="72" rx="36" className="mascot-torso" />
          <rect x="62" y="176" width="76" height="26" rx="13" className="mascot-skirt" />
          <circle cx="100" cy="158" r="10" className="mascot-chest-ring" />
          <circle cx="100" cy="158" r="4" className="mascot-chest-dot" />

          {/* 옆면 귀(돌기) */}
          <path d="M 48 88 Q 18 96 24 124 Q 38 122 52 102 Z" className="mascot-ear" />
          <path d="M 152 88 Q 182 96 176 124 Q 162 122 148 102 Z" className="mascot-ear" />
          <circle cx="24" cy="120" r="6" className="mascot-ear-tip" />
          <circle cx="176" cy="120" r="6" className="mascot-ear-tip" />

          {/* 머리 */}
          <rect x="48" y="46" width="104" height="96" rx="38" className="mascot-head" />

          {/* 위쪽 뿔 스파이크 + 안테나 */}
          <path d="M 76 50 L 84 14 L 94 50 Z" className="mascot-spike mascot-spike-a" />
          <path d="M 96 50 L 106 8 L 116 50 Z" className="mascot-spike mascot-spike-b" />
          <line x1="132" y1="46" x2="140" y2="26" className="mascot-antenna-line" />
          <circle cx="142" cy="22" r="7" className="mascot-antenna-ball" />

          {/* 얼굴 바이저 */}
          <rect x="64" y="86" width="72" height="32" rx="15" className="mascot-visor" />
          {eyes}
          {mouth}

          <ellipse cx="78" cy="66" rx="18" ry="11" className="mascot-shine" />
        </g>
      </svg>
    </div>
  )
}

const EYES: Record<MascotMood, React.ReactNode> = {
  idle: (
    <g className="mascot-eyes">
      <circle cx="84" cy="102" r="7" className="mascot-eye" />
      <circle cx="116" cy="102" r="7" className="mascot-eye" />
    </g>
  ),
  happy: (
    <g className="mascot-eyes">
      <path d="M 76 105 Q 84 93 92 105" className="mascot-eye-arc" />
      <path d="M 108 105 Q 116 93 124 105" className="mascot-eye-arc" />
    </g>
  ),
  excited: (
    <g className="mascot-eyes">
      <circle cx="84" cy="102" r="9" className="mascot-eye mascot-eye-glow" />
      <circle cx="116" cy="102" r="9" className="mascot-eye mascot-eye-glow" />
    </g>
  ),
  sad: (
    <g className="mascot-eyes">
      <path d="M 77 97 L 91 103" className="mascot-eye-line" />
      <path d="M 123 97 L 109 103" className="mascot-eye-line" />
      <circle cx="84" cy="107" r="5" className="mascot-eye mascot-eye-dim" />
      <circle cx="116" cy="107" r="5" className="mascot-eye mascot-eye-dim" />
    </g>
  ),
}

const MOUTHS: Record<MascotMood, React.ReactNode> = {
  idle: <rect x="92" y="111" width="16" height="4" rx="2" className="mascot-mouth" />,
  happy: <path d="M 90 109 Q 100 117 110 109" className="mascot-mouth-arc" />,
  excited: <rect x="88" y="108" width="24" height="8" rx="4" className="mascot-mouth mascot-mouth-open" />,
  sad: <path d="M 90 115 Q 100 108 110 115" className="mascot-mouth-arc" />,
}
