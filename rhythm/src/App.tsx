import { useRef, useState } from 'react'
import './App.css'
import type { Chart, Difficulty, PlayResult } from './engine/types'
import { decodeAndAnalyze } from './engine/analyze'
import { saveBestIfHigher } from './engine/save'
import StartScreen from './screens/StartScreen'
import PlayScreen from './screens/PlayScreen'
import ResultScreen from './screens/ResultScreen'

type Screen = 'start' | 'play' | 'result'

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [songInfo, setSongInfo] = useState<{ name: string; size: number } | null>(null)
  const [chart, setChart] = useState<Chart | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)
  const [playResult, setPlayResult] = useState<PlayResult | null>(null)
  const [isNewBest, setIsNewBest] = useState(false)
  const [playToken, setPlayToken] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)

  function getAudioCtx(): AudioContext {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    return audioCtxRef.current
  }

  async function handleReady(file: File, diff: Difficulty) {
    const ctx = getAudioCtx()
    if (ctx.state === 'suspended') await ctx.resume()
    const { chart: c, audioBuffer: buf } = await decodeAndAnalyze(file, diff, ctx)
    if (c.notes.length === 0) {
      throw new Error('이 파일에서는 박자를 충분히 찾지 못했어요. 다른 파일로 시도해 보세요.')
    }
    setSongInfo({ name: file.name, size: file.size })
    setDifficulty(diff)
    setChart(c)
    setAudioBuffer(buf)
    setPlayResult(null)
    setPlayToken((t) => t + 1)
    setScreen('play')
  }

  function handleFinish(result: PlayResult) {
    setPlayResult(result)
    if (songInfo) {
      setIsNewBest(saveBestIfHigher(songInfo.name, songInfo.size, difficulty, result))
    }
    setScreen('result')
  }

  function handleRetry() {
    setPlayResult(null)
    setPlayToken((t) => t + 1)
    setScreen('play')
  }

  function handleNewSong() {
    setScreen('start')
    setChart(null)
    setAudioBuffer(null)
    setSongInfo(null)
    setPlayResult(null)
  }

  return (
    <div className="app">
      {screen === 'start' && <StartScreen onReady={handleReady} />}
      {screen === 'play' && chart && audioBuffer && (
        <PlayScreen
          key={playToken}
          chart={chart}
          audioBuffer={audioBuffer}
          audioCtx={getAudioCtx()}
          songName={songInfo?.name ?? ''}
          onFinish={handleFinish}
          onQuit={handleNewSong}
        />
      )}
      {screen === 'result' && playResult && (
        <ResultScreen result={playResult} isNewBest={isNewBest} songName={songInfo?.name ?? ''} difficulty={difficulty} onRetry={handleRetry} onNewSong={handleNewSong} />
      )}
    </div>
  )
}
