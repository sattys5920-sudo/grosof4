import { useEffect, useState } from 'react'

export type MascotMood = 'idle' | 'happy' | 'excited' | 'sad'

const SPEECH: Record<MascotMood, string[]> = {
  idle: ['리듬 타 바!', '스우파 가 보자고', '박자가 두둥탁'],
  happy: ['지리는데?', '오지는데?', '개쩔었수다'],
  excited: ['ㄷㄷ 박자의 신', '오르페우스잖아!!', '추, 춤이 나올 것만 같아'],
  sad: ['아 님 ㄱ-', '흥이 다 깨져 버렸잖아', '에궁.. 잘 좀 해 보셔요'],
}

/** 화이트/블루/옐로 톤의 동글동글한 로봇 마스코트.
 * 사용자가 보내준 참고 이미지는 실제 상용 리듬게임의 저작권 있는 캐릭터라
 * 로고·구체적 조형을 그대로 베끼진 않았지만, 그 캐릭터의 전체적인 색
 * 배치(둥근 흰 몸체, 파란 아래쪽 투톤, 주황 포인트, 동그란 손)는 참고해
 * 새로 그린 오리지널 디자인이다. 머리와 몸통을 거의 같은 크기의 원 두
 * 개로 쌓고(눈사람형), 귀는 옆이 아니라 정수리 위에, 눈·입은 로봇 화면에
 * 출력되는 도트 매트릭스(픽셀) 스타일로 그렸다. 평소에는 고개를 계속
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
      <svg viewBox="0 0 200 232" className="mascot-svg" aria-hidden="true">
        <defs>
          <clipPath id="mascotBodyClip">
            <circle cx="100" cy="160" r="52" />
          </clipPath>
        </defs>

        {mood === 'excited' && (
          <g className="mascot-sparkles">
            <circle cx="16" cy="60" r="5" />
            <circle cx="184" cy="80" r="4" />
            <circle cx="20" cy="150" r="3.5" />
            <circle cx="180" cy="160" r="5" />
          </g>
        )}

        {/* 발 (고개 흔들 때도 가만히 있는 부분) */}
        <ellipse cx="76" cy="214" rx="14" ry="8" className="mascot-foot" />
        <ellipse cx="124" cy="214" rx="14" ry="8" className="mascot-foot" />

        {/* 몸통 + 머리 (까딱까딱 흔들리는 부분) */}
        <g className={`mascot-head-group ${nodBump ? 'mascot-head-bump' : ''}`}>
          {/* 팔 + 손 */}
          <rect x="40" y="148" width="24" height="14" rx="7" className="mascot-arm" />
          <rect x="136" y="148" width="24" height="14" rx="7" className="mascot-arm" />
          <circle cx="38" cy="155" r="11" className="mascot-hand" />
          <circle cx="162" cy="155" r="11" className="mascot-hand" />

          {/* 몸통(원) + 아래쪽 파란 투톤 */}
          <circle cx="100" cy="160" r="52" className="mascot-torso" />
          <g clipPath="url(#mascotBodyClip)">
            <ellipse cx="100" cy="196" rx="58" ry="32" className="mascot-skirt" />
          </g>
          <circle cx="100" cy="160" r="52" className="mascot-torso-edge" />
          <circle cx="100" cy="148" r="9" className="mascot-chest-ring" />
          <circle cx="100" cy="148" r="3.5" className="mascot-chest-dot" />

          {/* 머리(원, 몸통과 거의 같은 크기) */}
          <circle cx="100" cy="80" r="50" className="mascot-head" />

          {/* 귀 — 옆이 아니라 정수리 위 */}
          <circle cx="72" cy="36" r="15" className="mascot-ear" />
          <circle cx="72" cy="36" r="6" className="mascot-ear-tip" />
          <circle cx="128" cy="36" r="15" className="mascot-ear" />
          <circle cx="128" cy="36" r="6" className="mascot-ear-tip" />

          {/* 안테나 */}
          <line x1="100" y1="30" x2="100" y2="8" className="mascot-antenna-line" />
          <circle cx="100" cy="4" r="6.5" className="mascot-antenna-ball" />

          {/* 얼굴 바이저(도트 매트릭스 화면) */}
          <rect x="66" y="66" width="68" height="28" rx="8" className="mascot-visor" />
          {eyes}
          {mouth}

          <ellipse cx="80" cy="62" rx="15" ry="8" className="mascot-shine" />
        </g>
      </svg>
    </div>
  )
}

/** 4x4 픽셀을 눈 하나당 7개씩 뭉쳐서 둥근 도트 매트릭스 눈을 만든다.
 * 표정마다 이 픽셀들을 다른 배열로 늘어놓는다 — 로봇 화면에 실제로
 * 출력되는 듯한 느낌을 유지하기 위해 원이나 곡선 대신 항상 각진
 * 사각 픽셀만 쓴다. */
const EYES: Record<MascotMood, React.ReactNode> = {
  idle: (
    <g className="mascot-eyes">
      <rect x="80" y="72" width="4" height="4" className="mascot-eye" />
      <rect x="86" y="72" width="4" height="4" className="mascot-eye" />
      <rect x="77" y="78" width="4" height="4" className="mascot-eye" />
      <rect x="83" y="78" width="4" height="4" className="mascot-eye" />
      <rect x="89" y="78" width="4" height="4" className="mascot-eye" />
      <rect x="80" y="84" width="4" height="4" className="mascot-eye" />
      <rect x="86" y="84" width="4" height="4" className="mascot-eye" />
      <rect x="112" y="72" width="4" height="4" className="mascot-eye" />
      <rect x="118" y="72" width="4" height="4" className="mascot-eye" />
      <rect x="109" y="78" width="4" height="4" className="mascot-eye" />
      <rect x="115" y="78" width="4" height="4" className="mascot-eye" />
      <rect x="121" y="78" width="4" height="4" className="mascot-eye" />
      <rect x="112" y="84" width="4" height="4" className="mascot-eye" />
      <rect x="118" y="84" width="4" height="4" className="mascot-eye" />
    </g>
  ),
  happy: (
    <g className="mascot-eyes">
      <rect x="77" y="80" width="4" height="4" className="mascot-eye" />
      <rect x="83" y="72" width="4" height="4" className="mascot-eye" />
      <rect x="89" y="80" width="4" height="4" className="mascot-eye" />
      <rect x="109" y="80" width="4" height="4" className="mascot-eye" />
      <rect x="115" y="72" width="4" height="4" className="mascot-eye" />
      <rect x="121" y="80" width="4" height="4" className="mascot-eye" />
    </g>
  ),
  excited: (
    <g className="mascot-eyes">
      <rect x="79" y="71" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="86" y="71" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="76" y="78" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="83" y="78" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="90" y="78" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="79" y="85" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="86" y="85" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="111" y="71" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="118" y="71" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="108" y="78" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="115" y="78" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="122" y="78" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="111" y="85" width="5" height="5" className="mascot-eye mascot-eye-glow" />
      <rect x="118" y="85" width="5" height="5" className="mascot-eye mascot-eye-glow" />
    </g>
  ),
  sad: (
    <g className="mascot-eyes">
      <rect x="77" y="74" width="4" height="4" className="mascot-eye mascot-eye-dim" />
      <rect x="83" y="82" width="4" height="4" className="mascot-eye mascot-eye-dim" />
      <rect x="89" y="74" width="4" height="4" className="mascot-eye mascot-eye-dim" />
      <rect x="109" y="74" width="4" height="4" className="mascot-eye mascot-eye-dim" />
      <rect x="115" y="82" width="4" height="4" className="mascot-eye mascot-eye-dim" />
      <rect x="121" y="74" width="4" height="4" className="mascot-eye mascot-eye-dim" />
    </g>
  ),
}

const MOUTHS: Record<MascotMood, React.ReactNode> = {
  idle: (
    <g>
      <rect x="92" y="89" width="4" height="4" className="mascot-mouth" />
      <rect x="98" y="89" width="4" height="4" className="mascot-mouth" />
      <rect x="104" y="89" width="4" height="4" className="mascot-mouth" />
    </g>
  ),
  happy: (
    <g>
      <rect x="90" y="88" width="4" height="4" className="mascot-mouth" />
      <rect x="98" y="92" width="4" height="4" className="mascot-mouth" />
      <rect x="106" y="88" width="4" height="4" className="mascot-mouth" />
    </g>
  ),
  excited: <rect x="90" y="87" width="20" height="11" rx="2" className="mascot-mouth mascot-mouth-open" />,
  sad: (
    <g>
      <rect x="90" y="92" width="4" height="4" className="mascot-mouth mascot-mouth-dim" />
      <rect x="98" y="88" width="4" height="4" className="mascot-mouth mascot-mouth-dim" />
      <rect x="106" y="92" width="4" height="4" className="mascot-mouth mascot-mouth-dim" />
    </g>
  ),
}
