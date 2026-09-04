import { useEffect, useState } from 'react'
import './App.css'
import { createInitialState, endActionsIfDone } from './engine/gameEngine'
import { loadGame, saveGame, clearGame } from './engine/save'
import type { Difficulty, GameState } from './engine/types'
import StartScreen from './screens/StartScreen'
import GameScreen from './screens/GameScreen'
import GameOverScreen from './screens/GameOverScreen'

export default function App() {
  const [state, setState] = useState<GameState | null>(null)
  const [hasSave, setHasSave] = useState(false)

  useEffect(() => {
    setHasSave(loadGame() !== null)
  }, [])

  function update(raw: GameState) {
    // 행동을 4번 다 쓰면(혹은 패스로 소진하면) 자동으로 카드 뽑기 -> 감염
    // 단계까지 이어서 처리한다. 손패 제한(phase: 'discard')에 걸리면 거기서
    // 멈추고 UI가 버릴 카드를 고를 때까지 기다린다.
    const next = raw.phase === 'actions' ? endActionsIfDone(raw) : raw
    setState(next)
    saveGame(next)
  }

  function startNewGame(difficulty: Difficulty) {
    const fresh = createInitialState(difficulty)
    update(fresh)
  }

  function continueGame() {
    const saved = loadGame()
    if (saved) {
      setState(saved)
      setHasSave(true)
    }
  }

  function restart() {
    clearGame()
    setState(null)
    setHasSave(false)
  }

  if (!state) {
    return <StartScreen hasSave={hasSave} onNewGame={startNewGame} onContinue={continueGame} />
  }

  if (state.phase === 'ended') {
    return <GameOverScreen state={state} onRestart={restart} />
  }

  return <GameScreen state={state} onChange={update} onRestart={restart} />
}
