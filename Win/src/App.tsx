import { useState } from 'react'
import './styles/App.css'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import Player from './components/Player'
import QueueView from './components/QueueView'
import TitleBar from './components/TitleBar'
import { PlayerProvider } from './contexts/PlayerContext'
import { LibraryProvider } from './contexts/LibraryContext'
function App() {
  const [currentView, setCurrentView] = useState<'home' | 'search' | 'library' | 'liked' | 'settings' | 'playlist'>('home')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('suckfy-theme')
    return saved !== null ? saved === 'dark' : true
  })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <PlayerProvider>
      <LibraryProvider>
        <div className={`app ${isDarkMode ? 'dark' : 'light'}`}>
          <TitleBar />
          <div className="app-container">
            <Sidebar 
              currentView={currentView} 
              onNavigate={setCurrentView}
              isDarkMode={isDarkMode}
              onToggleDarkMode={() => {
                const next = !isDarkMode
                setIsDarkMode(next)
                localStorage.setItem('suckfy-theme', next ? 'dark' : 'light')
              }}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
            <MainContent currentView={currentView} isDarkMode={isDarkMode} onToggleDarkMode={() => {
              const next = !isDarkMode
              setIsDarkMode(next)
              localStorage.setItem('suckfy-theme', next ? 'dark' : 'light')
            }} />
            <QueueView />
          </div>
          <Player />
        </div>
      </LibraryProvider>
    </PlayerProvider>
  )
}

export default App
