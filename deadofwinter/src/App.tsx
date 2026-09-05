import { useEffect, useRef, useState } from 'react'
import './App.css'
import MainMenu from './screens/MainMenu'
import Lobby from './screens/Lobby'
import { createRoom, joinRoom, watchRoom, toggleReady, startGame } from './engine/room'
import { ensureSignedIn } from './firebase'
import type { RoomDoc } from './engine/types'
import type { Unsubscribe } from 'firebase/firestore'

type Screen = 'menu' | 'lobby' | 'playing'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [code, setCode] = useState('')
  const [room, setRoom] = useState<RoomDoc | null>(null)
  const [myUid, setMyUid] = useState('')
  const unsubRef = useRef<Unsubscribe | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const joinCode = params.get('join')
    if (joinCode) setCode(joinCode.toUpperCase())
    return () => {
      unsubRef.current?.()
    }
  }, [])

  function watchAndEnter(roomCode: string) {
    unsubRef.current?.()
    setCode(roomCode)
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

  function handleLeave() {
    unsubRef.current?.()
    unsubRef.current = null
    setRoom(null)
    setScreen('menu')
    setErrorMsg('')
  }

  return (
    <div className="app-shell">
      {screen === 'menu' && <MainMenu busy={busy} errorMsg={errorMsg} onCreate={handleCreate} onJoin={handleJoin} />}
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
      {screen === 'playing' && (
        <div className="menu-screen">
          <div className="menu-emblem">🚧</div>
          <h1 className="menu-title">공사 중</h1>
          <p className="menu-desc">
            방 {code}, 4명 전원 준비 완료! 실제 게임 진행(행동 주사위·이동·좀비·위기·크로스로드)은 다음 단계에서 이어서
            구현합니다.
          </p>
        </div>
      )}
    </div>
  )
}
