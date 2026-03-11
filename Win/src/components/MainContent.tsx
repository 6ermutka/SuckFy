import React from 'react'
import '../styles/MainContent.css'
import HomeView from './views/HomeView'
import SearchView from './views/SearchView'
import LibraryView from './views/LibraryView'
import LikedSongsView from './views/LikedSongsView'
import SettingsView from './views/SettingsView'
import PlaylistView from './views/PlaylistView'

interface MainContentProps {
  currentView: string
  isDarkMode: boolean
  onToggleDarkMode: () => void
}

const MainContent: React.FC<MainContentProps> = ({ currentView, isDarkMode, onToggleDarkMode }) => {
  const renderView = () => {
    // Check if it's a playlist view
    if (currentView.startsWith('playlist-')) {
      const playlistId = currentView.replace('playlist-', '')
      return <PlaylistView playlistId={playlistId} />
    }

    switch (currentView) {
      case 'home':
        return <HomeView />
      case 'search':
        return <SearchView />
      case 'library':
        return <LibraryView />
      case 'liked':
        return <LikedSongsView />
      case 'settings':
        return <SettingsView isDarkMode={isDarkMode} onToggleDarkMode={onToggleDarkMode} />
      default:
        return <HomeView />
    }
  }

  return (
    <div className="main-content">
      {renderView()}
    </div>
  )
}

export default MainContent
