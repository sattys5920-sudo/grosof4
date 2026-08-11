import { useState } from 'react'
import './App.css'
import { GameProvider, useGame } from './state/GameContext'
import { TabBar } from './components/TabBar'
import { BroadcastPopup } from './components/BroadcastPopup'
import { DmModal } from './components/DmModal'
import { StoryIntroScreen } from './screens/StoryIntroScreen'
import { SignupScreen } from './screens/SignupScreen'
import { RoleRevealScreen } from './screens/RoleRevealScreen'
import { MainFeedScreen } from './screens/MainFeedScreen'
import { ClassroomScreen } from './screens/ClassroomScreen'
import { RoomsScreen } from './screens/RoomsScreen'
import { MissionScreen } from './screens/MissionScreen'
import { ProfileScreen } from './screens/ProfileScreen'

function Screen() {
  const { activeTab } = useGame()
  switch (activeTab) {
    case 'main':
      return <MainFeedScreen />
    case 'classroom':
      return <ClassroomScreen />
    case 'rooms':
      return <RoomsScreen />
    case 'mission':
      return <MissionScreen />
    case 'profile':
      return <ProfileScreen />
  }
}

function Shell() {
  return (
    <div className="shell">
      <div className="shell__fog" />
      <header className="shell__header">
        <span className="shell__title">OO고등학교</span>
        <span className="shell__status">
          <span className="shell__dot" />
          안개 결계 · 자정 이후
        </span>
      </header>
      <main className="shell__body">
        <Screen />
      </main>
      <TabBar />
      <BroadcastPopup />
      <DmModal />
    </div>
  )
}

function Gate() {
  const { signedUp, roleRevealed } = useGame()
  const [introSeen, setIntroSeen] = useState(false)
  if (!introSeen) return <StoryIntroScreen onEnter={() => setIntroSeen(true)} />
  if (!signedUp) return <SignupScreen />
  if (!roleRevealed) return <RoleRevealScreen />
  return <Shell />
}

function App() {
  return (
    <GameProvider>
      <Gate />
    </GameProvider>
  )
}

export default App
