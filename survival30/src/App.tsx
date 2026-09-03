import { useState } from 'react'
import './App.css'
import { createInitialState } from './engine/engine'
import { clearGame, loadGame } from './engine/save'
import type { GameState } from './engine/types'
import PrepScreen from './screens/PrepScreen'
import DayScreen from './screens/DayScreen'
import EndingScreen from './screens/EndingScreen'

function loadOrCreate(): GameState {
  const saved = loadGame()
  return saved ?? createInitialState()
}

export default function App() {
  const [state, setState] = useState<GameState>(loadOrCreate)

  function handleRestart() {
    clearGame()
    setState(createInitialState())
  }

  if (state.phase === 'prep') {
    return <PrepScreen state={state} onChange={setState} />
  }
  if (state.phase === 'ended') {
    return <EndingScreen state={state} onRestart={handleRestart} />
  }
  return <DayScreen state={state} onChange={setState} />
}
