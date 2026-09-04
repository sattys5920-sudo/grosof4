import { useRef, useState } from 'react'
import './App.css'
import type { Chart, Difficulty, PlayResult } from './engine/types'
import { decodeAndAnalyze } from './engine/analyze'
import { saveBestIfHigher, loadNickname, saveNickname } from './engine/save'
import NicknameScreen from './screens/NicknameScreen'
import StartScreen from './screens/StartScreen'
import PlayScreen from './screens/PlayScreen'
import ResultScreen from './screens/ResultScreen'

type Screen = 'nickname' | 'start' | 'play' | 'result'

export default function App() {
  const [screen, setScreen] = useState<Screen>('nickname')
  const [nickname, setNickname] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  // 플레이 화면으로 넘어가도 목록을 다시 고를 필요 없게, 플레이리스트는
  // StartScreen이 아니라 여기(App)에 둬서 화면이 바뀌어도 유지되게 한다.
  const [playlist, setPlaylist] = useState<File[]>([])
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

  function handleNicknameSubmit(name: string) {
    saveNickname(name)
    setNickname(name)
    setScreen('start')
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
      {screen === 'nickname' && <NicknameScreen initialNickname={loadNickname()} onSubmit={handleNicknameSubmit} />}
      {screen === 'start' && <StartScreen playlist={playlist} onPlaylistChange={setPlaylist} onReady={handleReady} />}
      {screen === 'play' && chart && audioBuffer && (
        <PlayScreen
          key={playToken}
          chart={chart}
          audioBuffer={audioBuffer}
          audioCtx={getAudioCtx()}
          songName={songInfo?.name ?? ''}
          nickname={nickname}
          onFinish={handleFinish}
          onQuit={handleNewSong}
        />
      )}
      {screen === 'result' && playResult && (
        <ResultScreen
          result={playResult}
          isNewBest={isNewBest}
          songName={songInfo?.name ?? ''}
          nickname={nickname}
          difficulty={difficulty}
          onRetry={handleRetry}
          onNewSong={handleNewSong}
        />
      )}
    </div>
  )
}
