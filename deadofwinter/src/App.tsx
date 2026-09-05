import { useEffect, useRef, useState } from 'react'
import './App.css'
import MainMenu from './screens/MainMenu'
import Lobby from './screens/Lobby'
import GameScreen from './screens/GameScreen'
import { createRoom, joinRoom, watchRoom, toggleReady, startGame, endTurn, moveSurvivor, searchLocation, attackZombie, resolveBiteChoice } from './engine/room'
import { ensureSignedIn } from './firebase'
import type { LocationId, RoomDoc } from './engine/types'
import type { Unsubscribe } from 'firebase/firestore'

type Screen = 'menu' | 'lobby' | 'playing'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  // 첫 렌더보다 먼저 읽어야 한다 — useEffect로 나중에 세팅하면 MainMenu가
  // 이미 빈 값으로 마운트된 뒤라 내부 상태가 갱신되지 않는다.
  const [initialCode] = useState(() => new URLSearchParams(window.location.search).get('join')?.toUpperCase() ?? '')
  const [room, setRoom] = useState<RoomDoc | null>(null)
  const [myUid, setMyUid] = useState('')
  const unsubRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    return () => {
      unsubRef.current?.()
    }
  }, [])

  function watchAndEnter(roomCode: string) {
    unsubRef.current?.()
    unsubRef.current = watchRoom(roomCode, (next) => {
      setRoom(next)
      if (next?.phase === 'playing') setScreen('playing')
    })
    setScreen('lobby')
  }

  async function handleCreate(name: string) {
    setBusy(true)
    setErrorMsg('')
    try {
      const uid = await ensureSignedIn()
      if (uid) setMyUid(uid)
      const newCode = await createRoom(name)
      watchAndEnter(newCode)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '방을 만들지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(inputCode: string, name: string) {
    setBusy(true)
    setErrorMsg('')
    try {
      const uid = await ensureSignedIn()
      if (uid) setMyUid(uid)
      const joined = await joinRoom(inputCode, name)
      if (!joined) {
        setErrorMsg('입장할 수 없는 코드예요. 방이 없거나, 이미 4명이 모였거나, 게임이 이미 시작됐어요.')
        return
      }
      watchAndEnter(inputCode.trim().toUpperCase())
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '입장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggleReady() {
    if (!room) return
    setBusy(true)
    try {
      await toggleReady(room.code, room, myUid)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '준비 상태를 바꾸지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleStart() {
    if (!room) return
    setBusy(true)
    try {
      await startGame(room.code, room)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '게임을 시작하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleEndTurn() {
    if (!room) return
    setBusy(true)
    setErrorMsg('')
    try {
      await endTurn(room.code, room, myUid)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '턴을 종료하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleMove(survivorId: string, destination: LocationId) {
    if (!room) return
    setBusy(true)
    setErrorMsg('')
    try {
      await moveSurvivor(room.code, room, myUid, survivorId, destination)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '이동하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSearch(survivorId: string) {
    if (!room) return
    setBusy(true)
    setErrorMsg('')
    try {
      await searchLocation(room.code, room, myUid, survivorId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '탐색하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleAttack(survivorId: string) {
    if (!room) return
    setBusy(true)
    setErrorMsg('')
    try {
      await attackZombie(room.code, room, myUid, survivorId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '공격하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  async function handleResolveBite(choice: 'die' | 'reroll') {
    if (!room) return
    setBusy(true)
    setErrorMsg('')
    try {
      await resolveBiteChoice(room.code, room, myUid, choice)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '전염 판정을 처리하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  function handleLeave() {
    unsubRef.current?.()
    unsubRef.current = null
    setRoom(null)
    setScreen('menu')
    setErrorMsg('')
  }

  return (
    <div className="app-shell">
      {screen === 'menu' && (
        <MainMenu busy={busy} errorMsg={errorMsg} initialCode={initialCode} onCreate={handleCreate} onJoin={handleJoin} />
      )}
      {screen === 'lobby' && room && (
        <Lobby
          room={room}
          myUid={myUid}
          busy={busy}
          errorMsg={errorMsg}
          onToggleReady={handleToggleReady}
          onStart={handleStart}
          onLeave={handleLeave}
        />
      )}
      {screen === 'playing' && room && (
        <GameScreen
          room={room}
          myUid={myUid}
          busy={busy}
          errorMsg={errorMsg}
          onEndTurn={handleEndTurn}
          onMove={handleMove}
          onSearch={handleSearch}
          onAttack={handleAttack}
          onResolveBite={handleResolveBite}
        />
      )}
    </div>
  )
}
