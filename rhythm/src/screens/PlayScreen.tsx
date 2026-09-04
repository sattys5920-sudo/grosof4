import { useEffect, useMemo, useRef, useState } from 'react'
import type { Chart, Lane, NoteState, PlayResult } from '../engine/types'
import { autoMissNotes, classifyHit, findNoteToHit, summarize } from '../engine/judge'
import Mascot, { type MascotMood } from '../components/Mascot'

const KEYS = ['d', 'f', 'j', 'k']
const LANE_COLORS = ['#ff6b6b', '#ffd93d', '#5ce0a8', '#5aa8ff']
const LEAD_TIME = 1.6
const CANVAS_W = 480
const CANVAS_H = 700
const JUDGMENT_Y = CANVAS_H - 90

function makeInitialNotes(chart: Chart): NoteState[] {
  return chart.notes.map((n, i) => ({ ...n, id: i, judgment: null, judgedAt: null }))
}

export default function PlayScreen({
  chart,
  audioBuffer,
  audioCtx,
  songName,
  onFinish,
  onQuit,
}: {
  chart: Chart
  audioBuffer: AudioBuffer
  audioCtx: AudioContext
  songName: string
  onFinish: (result: PlayResult) => void
  onQuit: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const notesRef = useRef<NoteState[]>(makeInitialNotes(chart))
  const prevMissRef = useRef(0)
  const startTimeRef = useRef(0)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const rafRef = useRef(0)
  const finishedRef = useRef(false)

  const [liveResult, setLiveResult] = useState<PlayResult>(() => summarize(notesRef.current))
  const [pressed, setPressed] = useState([false, false, false, false])
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

      const laneW = CANVAS_W / 4
      for (let i = 0; i < 4; i++) {
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
        const dt = n.time - elapsed
        if (dt > LEAD_TIME || dt < -0.25) continue
        const y = JUDGMENT_Y - (dt / LEAD_TIME) * JUDGMENT_Y
        const x = n.lane * laneW + laneW / 2
        const w = laneW * 0.72
        const h = 26
        ctx.fillStyle = LANE_COLORS[n.lane]
        ctx.strokeStyle = 'rgba(10,14,20,0.7)'
        ctx.lineWidth = 3
        roundRect(ctx, x - w / 2, y - h / 2, w, h, 8)
        ctx.fill()
        ctx.stroke()
      }
    }

    function frame() {
      if (cancelled) return
      const elapsed = audioCtx.currentTime - startTimeRef.current
      const before = notesRef.current
      const after = autoMissNotes(before, elapsed)
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
      if (!e.repeat) setPressed((p) => p.map((v, i) => (i === lane ? true : v)))
      const elapsed = audioCtx.currentTime - startTimeRef.current
      const note = findNoteToHit(notesRef.current, lane, elapsed)
      if (!note) return
      const judgment = classifyHit(note.time - elapsed)
      if (!judgment) return
      const updated = notesRef.current.map((n) => (n.id === note.id ? { ...n, judgment, judgedAt: elapsed } : n))
      notesRef.current = updated
      const result = summarize(updated)
      setLiveResult(result)
      setPopup({ text: judgment.toUpperCase(), key: Date.now() })

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
      setMascotBump((b) => b + 1)
    }

    function onKeyUp(e: KeyboardEvent) {
      const lane = laneForKey(e.key)
      if (lane === -1) return
      setPressed((p) => p.map((v, i) => (i === lane ? false : v)))
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
        <div className="play-song-name">{songName}</div>
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
              <div key={k} className={`key-hint ${pressed[i] ? 'active' : ''}`} style={{ borderColor: LANE_COLORS[i] }}>
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
