import { useState } from 'react'
import type { AbracaState, Difficulty, SpellId } from '../engine/abracawhat'
import { createAbracaGame, declareSpell, confirmHandoff, SPELL_MAP } from '../engine/abracawhat'
import AbracaSetup from './AbracaSetup'
import AbracaPlay from './AbracaPlay'
import AbracaHandoff from './AbracaHandoff'
import AbracaResult from './AbracaResult'

interface SetupInfo {
  p1: string
  p2: string
  difficulty: Difficulty
}

/** 아브라카왓은 온라인 대전이 아니라 한 기기를 둘이 번갈아 보는 로컬
 * 핫시트 게임이라, Firebase·방 코드 없이 이 안에서 전부 끝난다. 상태는
 * 전부 이 컴포넌트의 메모리에만 있고 새로고침하면 사라진다 — 스펙이
 * "새로고침 전까지 유지"만 요구해서 굳이 localStorage까지 얹지 않았다. */
export default function AbracaGame({ onExit }: { onExit: () => void }) {
  const [state, setState] = useState<AbracaState | null>(null)
  const [setupInfo, setSetupInfo] = useState<SetupInfo | null>(null)
  const [resultFlash, setResultFlash] = useState<{ success: boolean; spellName: string } | null>(null)

  function handleStart(p1: string, p2: string, difficulty: Difficulty) {
    setSetupInfo({ p1, p2, difficulty })
    setState(createAbracaGame(p1, p2, difficulty))
  }

  function handleDeclare(spellId: SpellId) {
    if (!state || resultFlash) return
    const success = (state.players[state.currentPlayerIndex].remaining[spellId] ?? 0) > 0
    const spellName = SPELL_MAP[spellId].name
    setState(declareSpell(state, spellId))
    setResultFlash({ success, spellName })
    setTimeout(() => setResultFlash(null), 1500)
  }

  function handleHandoffConfirm() {
    if (!state) return
    setState(confirmHandoff(state))
  }

  function handleRestart() {
    if (!setupInfo) return
    setState(createAbracaGame(setupInfo.p1, setupInfo.p2, setupInfo.difficulty))
  }

  function handleExit() {
    setState(null)
    setSetupInfo(null)
    setResultFlash(null)
    onExit()
  }

  if (!state) return <AbracaSetup onStart={handleStart} onBack={onExit} />
  if (resultFlash) return <AbracaPlay state={state} resultFlash={resultFlash} onDeclare={handleDeclare} />
  if (state.phase === 'handoff') return <AbracaHandoff state={state} onConfirm={handleHandoffConfirm} />
  if (state.phase === 'result') return <AbracaResult state={state} onRestart={handleRestart} onExit={handleExit} />
  return <AbracaPlay state={state} resultFlash={null} onDeclare={handleDeclare} />
}
