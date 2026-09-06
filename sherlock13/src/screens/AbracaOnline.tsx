import { useEffect, useRef, useState } from 'react'
import type { Unsubscribe } from 'firebase/firestore'
import type { AbracaHandDoc, AbracaRole, AbracaRoomDoc } from '../engine/abracaTypes'
import type { Difficulty, SpellId } from '../engine/abracawhat'
import { SPELL_MAP } from '../engine/abracawhat'
import { createAbracaRoom, declareAbracaSpell, joinAbracaRoom, resolvePendingDeclare, watchAbracaRoom, watchOpponentHand } from '../engine/abracaRoom'
import AbracaSetup from './AbracaSetup'
import AbracaLobby from './AbracaLobby'
import AbracaPlay from './AbracaPlay'
import AbracaResult from './AbracaResult'

type Screen = 'setup' | 'lobby' | 'play' | 'result'

interface ResultFlash {
  success: boolean
  spellName: string
  declarerName: string
}

/** 아브라카왓 온라인 대전 컨트롤러. sherlock13 본편(App.tsx)의 방
 * 관리 패턴을 그대로 따르되, "내 손패는 나도 못 읽는다"는 이 게임만의
 * 규칙 때문에 두 가지가 추가된다: (1) 상대의 선언이 들어오면 내
 * 클라이언트가 자동으로 판정을 대신 해 주는 이펙트, (2) 판정 결과가
 * 새로 생기면 양쪽 다 잠깐 결과 연출을 보여주는 이펙트. */
export default function AbracaOnline({ onExit }: { onExit: () => void }) {
  const [screen, setScreen] = useState<Screen>('setup')
  const [code, setCode] = useState('')
  const [role, setRole] = useState<AbracaRole | null>(null)
  const [room, setRoom] = useState<AbracaRoomDoc | null>(null)
  const [opponentHand, setOpponentHand] = useState<AbracaHandDoc | null>(null)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [resultFlash, setResultFlash] = useState<ResultFlash | null>(null)

  const roomUnsubRef = useRef<Unsubscribe | null>(null)
  const handUnsubRef = useRef<Unsubscribe | null>(null)
  const resolvingRef = useRef(false)
  const lastDeclareLogLenRef = useRef(0)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      roomUnsubRef.current?.()
      handUnsubRef.current?.()
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    }
  }, [])

  function enterRoom(roomCode: string, roomRole: AbracaRole) {
    roomUnsubRef.current?.()
    handUnsubRef.current?.()
    setCode(roomCode)
    setRole(roomRole)
    lastDeclareLogLenRef.current = 0
    roomUnsubRef.current = watchAbracaRoom(roomCode, (next) => {
      setRoom(next)
      if (!next) return
      if (next.phase === 'lobby') setScreen('lobby')
      else if (next.phase === 'playing') setScreen('play')
      else if (next.phase === 'over') setScreen('result')
    })
    handUnsubRef.current = watchOpponentHand(roomCode, roomRole, setOpponentHand)
  }

  async function handleCreate(name: string, difficulty: Difficulty) {
    setBusy(true)
    setErrorMsg('')
    try {
      const newCode = await createAbracaRoom(name, difficulty)
      enterRoom(newCode, 'host')
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
      const joined = await joinAbracaRoom(inputCode, name)
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

  async function handleDeclare(spellId: SpellId) {
    if (!room || !role) return
    setBusy(true)
    setErrorMsg('')
    try {
      await declareAbracaSpell(code, room, role, spellId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '선언하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }

  // 상대가 방금 선언했으면(pendingDeclare.by가 내가 아니면) 내 손패를
  // 읽을 수 있는 건 나뿐이라, 내 클라이언트가 자동으로 판정을 대신
  // 해 준다 — 상대는 자기 손패를 절대 못 읽으므로 스스로 판정할 수 없다.
  useEffect(() => {
    if (!room || !role || !code) return
    if (!room.pendingDeclare || room.pendingDeclare.by === role) return
    if (resolvingRef.current) return
    resolvingRef.current = true
    resolvePendingDeclare(code, room, role)
      .catch((err) => setErrorMsg(err instanceof Error ? err.message : '판정하지 못했어요.'))
      .finally(() => {
        resolvingRef.current = false
      })
  }, [room, role, code])

  // declareLog가 늘어나면(=판정이 막 끝나면) 선언자·상대 양쪽 모두
  // 화면에 짧은 성공/실패 연출을 보여준다.
  useEffect(() => {
    if (!room) return
    if (room.declareLog.length > lastDeclareLogLenRef.current) {
      const entry = room.declareLog[room.declareLog.length - 1]
      const declarerName = room[entry.by].name
      setResultFlash({ success: entry.success, spellName: SPELL_MAP[entry.spellId].name, declarerName })
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
      flashTimerRef.current = setTimeout(() => setResultFlash(null), 1500)
    }
    lastDeclareLogLenRef.current = room.declareLog.length
  }, [room])

  function handleExit() {
    roomUnsubRef.current?.()
    roomUnsubRef.current = null
    handUnsubRef.current?.()
    handUnsubRef.current = null
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    setCode('')
    setRole(null)
    setRoom(null)
    setOpponentHand(null)
    setResultFlash(null)
    setScreen('setup')
    setErrorMsg('')
    onExit()
  }

  if (screen === 'setup' || !room || !role) {
    return <AbracaSetup onCreate={handleCreate} onJoin={handleJoin} onBack={onExit} busy={busy} errorMsg={errorMsg} />
  }
  if (screen === 'lobby') return <AbracaLobby code={code} onCancel={handleExit} />
  if (screen === 'result') return <AbracaResult room={room} myRole={role} onExit={handleExit} />
  return (
    <AbracaPlay room={room} myRole={role} opponentHand={opponentHand} resultFlash={resultFlash} busy={busy} errorMsg={errorMsg} onDeclare={handleDeclare} />
  )
}
