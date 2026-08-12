import './TabBar.css'
import { useGame, type TabId } from '../state/GameContext'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'main', label: '메인', icon: '▤' },
  { id: 'classroom', label: '강당', icon: '⌂' },
  { id: 'rooms', label: '구관', icon: '⌕' },
  { id: 'mission', label: '조사', icon: '⚑' },
  { id: 'shop', label: '매점', icon: '$' },
  { id: 'profile', label: '프로필', icon: '☺' },
]

export function TabBar() {
  const { activeTab, setActiveTab, classroom, hasUnreadDm } = useGame()
  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tabbar__item ${activeTab === tab.id ? 'is-active' : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          <span className="tabbar__icon">
            {tab.icon}
            {tab.id === 'classroom' && classroom.status === 'active' && (
              <span className="tabbar__ping" />
            )}
            {tab.id === 'profile' && hasUnreadDm && <span className="tabbar__ping" />}
          </span>
          <span className="tabbar__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
