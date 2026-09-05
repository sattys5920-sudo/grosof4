import { useEffect, useRef, useState } from 'react'
import './App.css'
import type { Role, RoomDoc, SuspectId } from './engine/types'
import { createRoom, joinRoom, watchRoom, getMyHand } from './engine/room'
import MainMenu from './screens/MainMenu'
import Lobby from './screens/Lobby'
import GameScreen from './screens/GameScreen'
import GameResultScreen from './screens/GameResult'

type Screen = 'menu' | 'lobby' | 'game'

function initialCodeFromUrl(): string {
  try {
    return new URLSearchParams(location.search).get('room')?.toUpperCase() ?? ''
  } catch {
    return ''
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [code, setCode] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [room, setRoom] = useState<RoomDoc | null>(null)
  const [myHand, setMyHand] = useState<SuspectId[]>([])
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const unsubRef = useRef<(() => void) | null>(null)
  const autoJoinTried = useRef(false)

  useEffect(() => {
    return () => {
      unsubRef.current?.()
    }
  }, [])

  function enterRoom(roomCode: string, roomRole: Role) {
    unsubRef.current?.()
    setCode(roomCode)
    setRole(roomRole)
    setScreen(roomRole === 'host' ? 'lobby' : 'game')
    unsubRef.current = watchRoom(roomCode, (next) => {
      setRoom(next)
      if (next && next.phase !== 'lobby') setScreen('game')
    })
    getMyHand(roomCode, roomRole).then(setMyHand)
  }

  async function handleCreate() {
    setBusy(true)
    setErrorMsg('')
    try {
      const newCode = await createRoom()
      enterRoom(newCode, 'host')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '방을 만들지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(inputCode: string) {
    setBusy(true)
    setErrorMsg('')
    try {
      const joined = await joinRoom(inputCode)
      if (!joined) {
        setErrorMsg('입장할 수 없는 코드예요. 코드를 다시 확인해 주세요.')
        return
      }
      enterRoom(inputCode.trim().toUpperCase(), joined.role)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '입장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const urlCode = initialCodeFromUrl()
    if (urlCode && !autoJoinTried.current) {
      autoJoinTried.current = true
      handleJoin(urlCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function refreshHand() {
    if (code && role) getMyHand(code, role).then(setMyHand)
  }

  function exitToMenu() {
    unsubRef.current?.()
    unsubRef.current = null
    setScreen('menu')
    setCode('')
    setRole(null)
    setRoom(null)
    setMyHand([])
  }

  return (
    <div className="app">
      {screen === 'menu' && <MainMenu onCreate={handleCreate} onJoin={handleJoin} busy={busy} errorMsg={errorMsg} />}
      {screen === 'lobby' && code && <Lobby code={code} onCancel={exitToMenu} />}
      {screen === 'game' && room && role && code && room.phase !== 'over' && (
        <GameScreen code={code} role={role} room={room} myHand={myHand} onHandChanged={refreshHand} />
      )}
      {screen === 'game' && room && role && room.phase === 'over' && room.result && (
        <GameResultScreen result={room.result} role={role} onPlayAgain={exitToMenu} onExit={exitToMenu} />
      )}
    </div>
  )
}
