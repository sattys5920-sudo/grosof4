import { useEffect, useRef, useState } from 'react'
import './App.css'
import type { Role, RoomDoc } from './engine/types'
import { createRoom, joinRoom, watchRoom, placeStone, claimTimeout } from './engine/room'
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

function secondsLeft(deadline: number | null): number {
  if (!deadline) return 0
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [code, setCode] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const [room, setRoom] = useState<RoomDoc | null>(null)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const unsubRef = useRef<(() => void) | null>(null)
  const autoJoinTried = useRef(false)
  const timeoutClaimedFor = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      unsubRef.current?.()
    }
  }, [])

  // 60초 턴 타이머. 매초 남은 시간을 다시 계산하고, 0이 되면 누구든(양쪽
  // 다 이 effect가 돌고 있음) 시간패를 선언한다 — claimTimeout이 이미
  // 끝난 상태에선 조용히 무시하므로 두 클라이언트가 동시에 불러도 안전.
  useEffect(() => {
    if (!room || !code || room.phase !== 'playing' || !room.turnDeadline) {
      setRemainingSeconds(0)
      return
    }
    const deadline = room.turnDeadline
    setRemainingSeconds(secondsLeft(deadline))
    const tick = setInterval(() => {
      const left = secondsLeft(deadline)
      setRemainingSeconds(left)
      if (left <= 0) {
        const key = `${code}:${deadline}`
        if (timeoutClaimedFor.current !== key) {
          timeoutClaimedFor.current = key
          claimTimeout(code, room).catch(() => {
            // 이미 다른 쪽이 처리했거나 그 사이 게임이 끝났으면 그냥 무시
          })
        }
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [room, code])

  function enterRoom(roomCode: string, roomRole: Role) {
    unsubRef.current?.()
    setCode(roomCode)
    setRole(roomRole)
    setScreen(roomRole === 'host' ? 'lobby' : 'game')
    unsubRef.current = watchRoom(roomCode, (next) => {
      setRoom(next)
      if (next && next.phase !== 'lobby') setScreen('game')
    })
  }

  async function handleCreate(name: string) {
    setBusy(true)
    setErrorMsg('')
    try {
      const newCode = await createRoom(name)
      enterRoom(newCode, 'host')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '방을 만들지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(name: string, inputCode: string) {
    setBusy(true)
    setErrorMsg('')
    try {
      const joined = await joinRoom(inputCode, name)
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
      handleJoin('', urlCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handlePlace(row: number, col: number) {
    if (!room || !role || !code) return
    setErrorMsg('')
    setBusy(true)
    try {
      await placeStone(code, room, role, row, col)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '착수하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  function exitToMenu() {
    unsubRef.current?.()
    unsubRef.current = null
    setScreen('menu')
    setCode('')
    setRole(null)
    setRoom(null)
    setErrorMsg('')
  }

  return (
    <div className="app">
      {screen === 'menu' && <MainMenu onCreate={handleCreate} onJoin={handleJoin} busy={busy} errorMsg={errorMsg} />}
      {screen === 'lobby' && code && <Lobby code={code} onCancel={exitToMenu} />}
      {screen === 'game' && room && role && code && room.phase !== 'over' && (
        <GameScreen
          code={code}
          role={role}
          room={room}
          remainingSeconds={remainingSeconds}
          busy={busy}
          errorMsg={errorMsg}
          onPlace={handlePlace}
        />
      )}
      {screen === 'game' && room && role && room.phase === 'over' && room.result && (
        <GameResultScreen result={room.result} role={role} room={room} onPlayAgain={exitToMenu} onExit={exitToMenu} />
      )}
    </div>
  )
}
