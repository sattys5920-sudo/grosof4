import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Chart, Judgment, Lane, NoteState, PlayResult } from '../engine/types'
import { autoMissNotes, classifyHit, findNoteToHit, summarize, HOLD_RELEASE_TOLERANCE } from '../engine/judge'
import Mascot, { type MascotMood } from '../components/Mascot'

const KEYS = ['d', 'f', 'g', 'h', 'j']
const LANE_COLORS = ['#ff6b6b', '#ffd93d', '#5ce0a8', '#5aa8ff', '#ff6b9d']
const LEAD_TIME = 1.6
const CANVAS_W = 480
const CANVAS_H = 700
const JUDGMENT_Y = CANVAS_H - 90

interface ActiveHold {
  noteId: number
  startJudgment: Judgment
}

function makeInitialNotes(chart: Chart): NoteState[] {
  return chart.notes.map((n, i) => ({ ...n, id: i, judgment: null, judgedAt: null }))
}

function clampDt(dt: number): number {
  return Math.max(Math.min(dt, LEAD_TIME), -0.3)
}

export default function PlayScreen({
  chart,
  audioBuffer,
  audioCtx,
  songName,
  nickname,
  onFinish,
  onQuit,
}: {
  chart: Chart
  audioBuffer: AudioBuffer
  audioCtx: AudioContext
  songName: string
  nickname: string
  onFinish: (result: PlayResult) => void
  onQuit: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const notesRef = useRef<NoteState[]>(makeInitialNotes(chart))
  const activeHoldRef = useRef<Partial<Record<Lane, ActiveHold>>>({})
  const prevMissRef = useRef(0)
  const startTimeRef = useRef(0)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const rafRef = useRef(0)
  const finishedRef = useRef(false)

  const [liveResult, setLiveResult] = useState<PlayResult>(() => summarize(notesRef.current))
  const [pressed, setPressed] = useState(KEYS.map(() => false))
  const [mascotMood, setMascotMood] = useState<MascotMood>('idle')
  const [mascotBump, setMascotBump] = useState(0)
  const [popup, setPopup] = useState<{ text: string; key: number } | null>(null)

  const combo = useMemo(() => {
    // liveResult.maxCombo는 "최고" 콤보라, 실시간 콤보는 끝에서부터 다시 센다
    let current = 0
    for (let i = notesRef.current.length - 1; i >= 0; i--) {
      const j = notesRef.current[i].judgment
      if (j === null) continue
      if (j === 'miss') break
      current++
    }
    return current
    // liveResult가 바뀔 때만 다시 계산하면 충분하다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveResult])

  /** 노트 하나의 판정을 확정한다(점수/콤보/마스코트/팝업까지 전부).
   * 일반 노트는 누르는 즉시, 롱노트는 다 채우거나 실패했을 때 호출된다. */
  const applyJudgment = useCallback((noteId: number, judgment: Judgment, elapsed: number) => {
    const updated = notesRef.current.map((n) => (n.id === noteId ? { ...n, judgment, judgedAt: elapsed } : n))
    notesRef.current = updated
    const result = summarize(updated)
    setLiveResult(result)
    prevMissRef.current = result.counts.miss
    setPopup({ text: judgment.toUpperCase(), key: Date.now() })

    if (judgment === 'miss') {
      setMascotMood('sad')
    } else {
      let currentCombo = 0
      for (let i = updated.length - 1; i >= 0; i--) {
        const j = updated[i].judgment
        if (j === null) continue
        if (j === 'miss') break
        currentCombo++
      }
      if (judgment === 'perfect' && currentCombo > 0 && currentCombo % 10 === 0) {
        setMascotMood('excited')
      } else if (currentCombo >= 10) {
        setMascotMood('happy')
      } else {
        setMascotMood('idle')
      }
    }
    setMascotBump((b) => b + 1)
  }, [])

  /** 레인 하나를 "지금" 눌렀을 때의 판정 처리. 키보드(D F G H J)와 모바일
   * 터치 버튼이 똑같이 이 함수를 호출한다. 롱노트면 바로 확정하지 않고
   * releaseLane에서 놓을 때(또는 다 채웠을 때) 확정한다. */
  const hitLane = useCallback(
    (lane: Lane) => {
      const elapsed = audioCtx.currentTime - startTimeRef.current
      const note = findNoteToHit(notesRef.current, lane, elapsed)
      if (!note) return
      const judgment = classifyHit(note.time - elapsed)
      if (!judgment) return

      if (note.holdDuration) {
        activeHoldRef.current[lane] = { noteId: note.id, startJudgment: judgment }
        setPopup({ text: 'HOLD', key: Date.now() })
        return
      }
      applyJudgment(note.id, judgment, elapsed)
    },
    [audioCtx, applyJudgment],
  )

  /** 레인 하나를 놓았을 때 — 누르고 있던 롱노트가 있으면 충분히 채웠는지에
   * 따라 성공/실패를 확정한다. 일반 노트를 놓는 건 아무 의미 없다. */
  const releaseLane = useCallback(
    (lane: Lane) => {
      const active = activeHoldRef.current[lane]
      if (!active) return
      delete activeHoldRef.current[lane]
      const note = notesRef.current.find((n) => n.id === active.noteId)
      if (!note || note.judgment !== null) return // 이미 확정됨(자동 완료 등)
      const elapsed = audioCtx.currentTime - startTimeRef.current
      const endTime = note.time + (note.holdDuration ?? 0)
      if (elapsed >= endTime - HOLD_RELEASE_TOLERANCE) {
        applyJudgment(note.id, active.startJudgment, elapsed)
      } else {
        applyJudgment(note.id, 'miss', elapsed)
      }
    },
    [audioCtx, applyJudgment],
  )

  function handleTouchStart(lane: Lane) {
    setPressed((p) => p.map((v, i) => (i === lane ? true : v)))
    hitLane(lane)
  }

  function handleTouchEnd(lane: Lane) {
    setPressed((p) => p.map((v, i) => (i === lane ? false : v)))
    releaseLane(lane)
  }

  useEffect(() => {
    let cancelled = false
    const source = audioCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioCtx.destination)
    const startAt = audioCtx.currentTime + 0.15
    source.start(startAt)
    startTimeRef.current = startAt
    sourceRef.current = source

    function draw(elapsed: number) {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

      const laneW = CANVAS_W / KEYS.length
      for (let i = 0; i < KEYS.length; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.07)'
        ctx.fillRect(i * laneW, 0, laneW, CANVAS_H)
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, JUDGMENT_Y)
      ctx.lineTo(CANVAS_W, JUDGMENT_Y)
      ctx.stroke()

      for (const n of notesRef.current) {
        if (n.judgment !== null) continue
        const isHold = !!n.holdDuration
        const headDt = n.time - elapsed
        const tailDt = isHold ? n.time + n.holdDuration! - elapsed : headDt
        if (headDt > LEAD_TIME) continue
        if (tailDt < -0.25) continue

        const x = n.lane * laneW + laneW / 2
        const w = laneW * 0.72
        const headY = JUDGMENT_Y - (clampDt(headDt) / LEAD_TIME) * JUDGMENT_Y

        if (isHold) {
          const tailY = JUDGMENT_Y - (clampDt(tailDt) / LEAD_TIME) * JUDGMENT_Y
          const active = activeHoldRef.current[n.lane]?.noteId === n.id
          ctx.fillStyle = active ? LANE_COLORS[n.lane] : `${LANE_COLORS[n.lane]}aa`
          ctx.strokeStyle = active ? '#ffffff' : 'rgba(10,14,20,0.7)'
          ctx.lineWidth = active ? 3.5 : 3
          const top = Math.min(tailY, headY) - 13
          const bottom = Math.max(tailY, headY) + 13
          roundRect(ctx, x - w / 2, top, w, bottom - top, 10)
          ctx.fill()
          ctx.stroke()
        } else {
          const h = 26
          ctx.fillStyle = LANE_COLORS[n.lane]
          ctx.strokeStyle = 'rgba(10,14,20,0.7)'
          ctx.lineWidth = 3
          roundRect(ctx, x - w / 2, headY - h / 2, w, h, 8)
          ctx.fill()
          ctx.stroke()
        }
      }
    }

    function frame() {
      if (cancelled) return
      const elapsed = audioCtx.currentTime - startTimeRef.current

      // 롱노트를 계속 누르고 있는 채로 지속 시간을 다 채웠으면, 손을 떼기
      // 전이라도 그 자리에서 바로 성공으로 확정한다.
      for (const key of Object.keys(activeHoldRef.current)) {
        const lane = Number(key) as Lane
        const active = activeHoldRef.current[lane]
        if (!active) continue
        const note = notesRef.current.find((n) => n.id === active.noteId)
        if (!note || note.judgment !== null) {
          delete activeHoldRef.current[lane]
          continue
        }
        const endTime = note.time + (note.holdDuration ?? 0)
        if (elapsed >= endTime) {
          delete activeHoldRef.current[lane]
          applyJudgment(note.id, active.startJudgment, elapsed)
        }
      }

      const holdingIds = new Set(
        Object.values(activeHoldRef.current)
          .filter((h): h is ActiveHold => !!h)
          .map((h) => h.noteId),
      )
      const before = notesRef.current
      const after = autoMissNotes(before, elapsed, holdingIds)
      if (after !== before) {
        notesRef.current = after
        const result = summarize(after)
        setLiveResult(result)
        if (result.counts.miss > prevMissRef.current) {
          prevMissRef.current = result.counts.miss
          setMascotMood('sad')
          setMascotBump((b) => b + 1)
          setPopup({ text: 'MISS', key: Date.now() })
        }
      }
      draw(elapsed)

      const totalTime = chart.duration + 1.2
      if (elapsed < totalTime && !finishedRef.current) {
        rafRef.current = requestAnimationFrame(frame)
      } else if (!finishedRef.current) {
        finishedRef.current = true
        onFinish(summarize(notesRef.current))
      }
    }
    rafRef.current = requestAnimationFrame(frame)

    function laneForKey(key: string): Lane | -1 {
      const idx = KEYS.indexOf(key.toLowerCase())
      return idx < 0 ? -1 : (idx as Lane)
    }

    function onKeyDown(e: KeyboardEvent) {
      const lane = laneForKey(e.key)
      if (lane === -1) return
      if (!e.repeat) {
        setPressed((p) => p.map((v, i) => (i === lane ? true : v)))
        hitLane(lane)
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      const lane = laneForKey(e.key)
      if (lane === -1) return
      setPressed((p) => p.map((v, i) => (i === lane ? false : v)))
      releaseLane(lane)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      try {
        source.stop()
      } catch {
        // 이미 끝났거나 정지된 경우 무시
      }
    }
    // chart/audioBuffer/audioCtx는 이 화면이 떠 있는 동안 바뀌지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleQuit() {
    finishedRef.current = true
    cancelAnimationFrame(rafRef.current)
    try {
      sourceRef.current?.stop()
    } catch {
      // 무시
    }
    onQuit()
  }

  return (
    <div className="play-screen">
      <div className="play-topbar">
        <div className="play-song-name">
          <span className="play-nickname">{nickname}</span> · {songName}
        </div>
        <div className="play-stats">
          <span className="play-score">{liveResult.score.toLocaleString()}</span>
          <span className="play-combo">{combo}콤보</span>
          <span className="play-accuracy">{liveResult.accuracy.toFixed(1)}%</span>
        </div>
        <button type="button" className="play-quit-btn" onClick={handleQuit}>
          그만하기
        </button>
      </div>

      <div className="play-stage">
        <div className="play-canvas-wrap">
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="play-canvas" />
          {popup && (
            <div key={popup.key} className={`judgment-popup judgment-${popup.text.toLowerCase()}`}>
              {popup.text}
            </div>
          )}
          <div className="key-hint-row">
            {KEYS.map((k, i) => (
              <div
                key={k}
                className={`key-hint ${pressed[i] ? 'active' : ''}`}
                style={{ borderColor: LANE_COLORS[i] }}
                onPointerDown={(e) => {
                  e.preventDefault()
                  handleTouchStart(i as Lane)
                }}
                onPointerUp={() => handleTouchEnd(i as Lane)}
                onPointerLeave={() => handleTouchEnd(i as Lane)}
                onPointerCancel={() => handleTouchEnd(i as Lane)}
              >
                {k.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
        <div className="play-mascot-slot">
          <Mascot mood={mascotMood} bump={mascotBump} />
        </div>
      </div>
    </div>
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
