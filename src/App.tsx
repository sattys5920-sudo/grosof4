import './App.css'
import { GameProvider, useGame } from './state/GameContext'
import { TabBar } from './components/TabBar'
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
    </div>
  )
}

function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  )
}

export default App
