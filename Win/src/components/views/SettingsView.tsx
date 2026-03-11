import React, { useState, useEffect } from 'react'
import '../../styles/SettingsView.css'

interface SettingsViewProps {
  isDarkMode: boolean
  onToggleDarkMode: () => void
}

const SettingsView: React.FC<SettingsViewProps> = ({ isDarkMode, onToggleDarkMode }) => {
  const [musicFolderPath, setMusicFolderPath] = useState('')
  const [cacheSize, setCacheSize] = useState('0 MB')
  const [fileCount, setFileCount] = useState(0)

  useEffect(() => {
    // Get music folder path from Electron
    if ((window as any).electron) {
      (window as any).electron.app.getCacheDir().then((path: string) => {
        setMusicFolderPath(path)
      })
    }

    // Calculate cache size on mount
    calculateCacheSize()
    
    console.log('📊 [SETTINGS] Loaded - checking storage...')
  }, [])
  
  // Recalculate when component becomes visible
  useEffect(() => {
    calculateCacheSize()
  }, [])

  const calculateCacheSize = async () => {
    try {
      // Get tracks from Electron metadata if available
      if ((window as any).electron?.app?.getLibraryMetadata) {
        const metadata = await (window as any).electron.app.getLibraryMetadata()
        const count = Object.keys(metadata.tracks || {}).length
        setFileCount(count)
        
        // Rough estimate: 3.5 MB per track
        const estimatedSize = (count * 3.5).toFixed(1)
        setCacheSize(`${estimatedSize} MB`)
        
        console.log('📊 [SETTINGS] File count:', count, 'Size:', estimatedSize, 'MB')
      } else {
        // Fallback to localStorage
        const STORAGE_KEY = 'suckfy_downloaded_tracks'
        const raw = localStorage.getItem(STORAGE_KEY)
        const downloadedTracks = JSON.parse(raw || '[]')
        
        const count = downloadedTracks.length
        setFileCount(count)
        
        const estimatedSize = (count * 3.5).toFixed(1)
        setCacheSize(`${estimatedSize} MB`)
        
        console.log('📊 [SETTINGS] File count:', count, 'Size:', estimatedSize, 'MB')
      }
    } catch (error) {
      console.error('📊 [SETTINGS] Error calculating cache size:', error)
    }
  }

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear all downloaded tracks? This cannot be undone.')) {
      try {
        // Clear all cache via Electron
        if ((window as any).electron?.app?.clearAllCache) {
          console.log('🗑️ [SETTINGS] Clearing cache via Electron...')
          const result = await (window as any).electron.app.clearAllCache()
          
          if (result.success) {
            console.log('✅ [SETTINGS] Cache cleared successfully')
            setCacheSize('0 MB')
            setFileCount(0)
            alert('Cache cleared successfully! All tracks and metadata have been removed.')
            window.location.reload()
          } else {
            console.error('❌ [SETTINGS] Failed to clear cache:', result.message)
            alert('Failed to clear cache: ' + result.message)
          }
        } else {
          // Fallback for web mode - clear localStorage only
          localStorage.removeItem('suckfy_downloaded_tracks')
          localStorage.removeItem('suckfy_liked_songs')
          localStorage.removeItem('suckfy_playlists')
          localStorage.removeItem('suckfy_recently_played')
          
          setCacheSize('0 MB')
          setFileCount(0)
          alert('Cache cleared successfully!')
          window.location.reload()
        }
      } catch (err) {
        console.error('❌ [SETTINGS] Error clearing cache:', err)
        alert('Failed to clear cache: ' + err)
      }
    }
  }

  const handleOpenMusicFolder = async () => {
    if ((window as any).electron?.shell && musicFolderPath) {
      try {
        await (window as any).electron.shell.openPath(musicFolderPath)
        console.log('Opened folder:', musicFolderPath)
      } catch (err) {
        console.error('Failed to open folder:', err)
        alert(`Music folder path: ${musicFolderPath}\n\nPlease open manually.`)
      }
    } else {
      alert(`Music folder path: ${musicFolderPath || 'Not set'}\n\nPlease open manually.`)
    }
  }


  return (
    <div className="settings-view">
      <div className="view-container">
        <h1 className="settings-title">Settings</h1>



        {/* Appearance */}
        <section className="settings-section">
          <h2 className="section-title">Appearance</h2>
          <div className="storage-item">
            <div className="storage-label">Theme</div>
            <div className="storage-value" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              {isDarkMode ? 'Dark mode' : 'Light mode'}
            </div>
            <button
              className="storage-button"
              onClick={onToggleDarkMode}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {isDarkMode ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                  Light
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                  Dark
                </>
              )}
            </button>
          </div>
        </section>

        {/* Storage */}
        <section className="settings-section">
          <h2 className="section-title">Storage</h2>
          
          <div className="storage-item">
            <div className="storage-label">Music Folder</div>
            <div 
              className="storage-value" 
              onClick={handleOpenMusicFolder}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              title="Click to open folder"
            >
              {musicFolderPath || '~/Music/SuckFy'}
            </div>
            <button className="storage-button" onClick={handleOpenMusicFolder}>Open</button>
          </div>

          <div className="storage-item">
            <div className="storage-label">Downloaded Tracks</div>
            <div className="storage-value">
              {fileCount} files
            </div>
            <span style={{ color: '#888', fontSize: '12px' }}>{cacheSize}</span>
          </div>

          <div className="storage-item">
            <div className="storage-label">Clear All Data</div>
            <div className="storage-value" style={{ color: '#888', fontSize: '13px' }}>
              Remove all downloaded tracks and cache
            </div>
            <button className="storage-button danger" onClick={handleClearCache}>Clear Cache</button>
          </div>
        </section>

        {/* Import */}
        <section className="settings-section">
          <h2 className="section-title">Import</h2>
          
          <div className="import-box">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="#22c55e">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#22c55e" strokeWidth="2"/>
            </svg>
            <div className="import-info">
              <div className="import-title">Import Local Tracks</div>
              <div className="import-subtitle">Add MP3, M4A, FLAC files from your computer</div>
            </div>
            <button className="import-button">Import</button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default SettingsView
