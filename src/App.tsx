import { useState } from 'react'
import './App.css'
import { GameProvider, useGame } from './state/GameContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TabBar } from './components/TabBar'
import { BroadcastPopup } from './components/BroadcastPopup'
import { TopBarAlert } from './components/TopBarAlert'
import { StoryIntroScreen } from './screens/StoryIntroScreen'
import { AuthScreen } from './screens/AuthScreen'
import { SignupScreen } from './screens/SignupScreen'
import { RoleRevealScreen } from './screens/RoleRevealScreen'
import { MainFeedScreen } from './screens/MainFeedScreen'
import { ClassroomScreen } from './screens/ClassroomScreen'
import { RoomsScreen } from './screens/RoomsScreen'
import { MissionScreen } from './screens/MissionScreen'
import { ShopScreen } from './screens/ShopScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { SCHOOL_NAME, CHARACTERS } from './data/characters'

const WEATHER_OPTIONS = ['안개 결계', '서리 결계', '정전 결계', '핏빛 결계', '잿빛 결계', '뒤틀린 결계']

function shellDate(year: number) {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${year}. ${mm}. ${dd}.`
}

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
    case 'shop':
      return <ShopScreen />
    case 'profile':
      return <ProfileScreen />
  }
}

function Shell() {
  const { viewerId } = useGame()
  const perceivedYear = viewerId ? CHARACTERS.find((c) => c.id === viewerId)?.perceivedYear : undefined
  const displayYear = perceivedYear ?? new Date().getFullYear()
  const [weather] = useState(() => WEATHER_OPTIONS[Math.floor(Math.random() * WEATHER_OPTIONS.length)])
  return (
    <div className="shell">
      <div className="shell__fog" />
      <header className="shell__header">
        <span className="shell__title">{SCHOOL_NAME}</span>
        <span className="shell__status">
          <span className="shell__date">{shellDate(displayYear)}</span>
          <span className="shell__dot" />
          {weather} · 시간 미상
        </span>
        <TopBarAlert />
      </header>
      <main className="shell__body">
        <Screen />
      </main>
      <TabBar />
      <BroadcastPopup />
    </div>
  )
}

function Gate() {
  const { viewerId, isAdmin, profileComplete, roleRevealed } = useGame()
  const [introSeen, setIntroSeen] = useState(false)
  if (!introSeen) return <StoryIntroScreen onEnter={() => setIntroSeen(true)} />
  if (!isAdmin && !viewerId) return <AuthScreen />
  if (!isAdmin && !profileComplete) return <SignupScreen />
  if (!roleRevealed) return <RoleRevealScreen />
  return <Shell />
}

function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <Gate />
      </GameProvider>
    </ErrorBoundary>
  )
}

export default App
