import React, { useState, useEffect } from 'react'
import '../styles/Sidebar.css'
import { useLibrary } from '../contexts/LibraryContext'

interface SidebarProps {
  currentView: string
  onNavigate: (view: any) => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isDarkMode, onToggleDarkMode, isCollapsed, onToggleCollapse }) => {
  const { playlists, createPlaylist, deletePlaylist, updatePlaylist } = useLibrary()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('')
  const [newPlaylistArtwork, setNewPlaylistArtwork] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; playlistId: string } | null>(null)
  const [editingPlaylist, setEditingPlaylist] = useState<{ id: string; name: string; description: string; artwork?: string } | null>(null)

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      createPlaylist(newPlaylistName.trim(), newPlaylistDesc.trim(), newPlaylistArtwork || undefined)
      setNewPlaylistName('')
      setNewPlaylistDesc('')
      setNewPlaylistArtwork('')
      setShowCreateModal(false)
    }
  }

  const handleSelectArtwork = async (isEdit: boolean = false) => {
    if ((window as any).electron) {
      // Use file picker to select image
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = (e: any) => {
        const file = e.target.files[0]
        if (file) {
          const reader = new FileReader()
          reader.onload = (event) => {
            if (isEdit && editingPlaylist) {
              setEditingPlaylist({ ...editingPlaylist, artwork: event.target?.result as string })
            } else {
              setNewPlaylistArtwork(event.target?.result as string)
            }
          }
          reader.readAsDataURL(file)
        }
      }
      input.click()
    }
  }
  
  const handleContextMenu = (e: React.MouseEvent, playlistId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, playlistId })
  }
  
  const handleDeletePlaylist = (playlistId: string) => {
    if (confirm('Are you sure you want to delete this playlist?')) {
      deletePlaylist(playlistId)
      setContextMenu(null)
    }
  }
  
  const handleEditPlaylist = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId)
    if (playlist) {
      setEditingPlaylist({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        artwork: playlist.customArtwork
      })
      setContextMenu(null)
    }
  }
  
  const handleSaveEdit = () => {
    if (editingPlaylist && editingPlaylist.name.trim()) {
      updatePlaylist(editingPlaylist.id, editingPlaylist.name.trim(), editingPlaylist.description, editingPlaylist.artwork)
      setEditingPlaylist(null)
    }
  }
  
  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-header">
        <div className="logo">
          <svg className="logo-icon" width="20" height="20" viewBox="0 0 24 24" fill="url(#logo-gradient)">
            <defs>
              <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#6ee7b7" />
              </linearGradient>
            </defs>
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            <path d="M12 7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
          {!isCollapsed && <span className="logo-text">SuckFy</span>}
        </div>
        <button className="sidebar-toggle" onClick={onToggleCollapse} title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="4" width="18" height="2" rx="1"/>
            <rect x="3" y="11" width="12" height="2" rx="1"/>
            <rect x="3" y="18" width="18" height="2" rx="1"/>
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <button 
          className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          {!isCollapsed && <span>Home</span>}
        </button>

        <button 
          className={`nav-item ${currentView === 'search' ? 'active' : ''}`}
          onClick={() => onNavigate('search')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          {!isCollapsed && <span>Search</span>}
        </button>

        <button 
          className={`nav-item ${currentView === 'library' ? 'active' : ''}`}
          onClick={() => onNavigate('library')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 5h2v14H3V5zm4 0h2v14H7V5zm4 0h6v14h-6V5zm8 0h2v14h-2V5z"/>
          </svg>
          {!isCollapsed && <span>Library</span>}
        </button>

        <button 
          className={`nav-item ${currentView === 'liked' ? 'active' : ''}`}
          onClick={() => onNavigate('liked')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          {!isCollapsed && <span>Liked Songs</span>}
        </button>

        <button 
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
          {!isCollapsed && <span>Settings</span>}
        </button>
      </nav>

      {!isCollapsed && (
        <button className="create-playlist" onClick={() => setShowCreateModal(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill="#22c55e"/>
            <path d="M12 7v10M7 12h10" stroke="#000" strokeWidth="2"/>
          </svg>
          <span>Create Playlist</span>
        </button>
      )}

      {/* Playlists */}
      {!isCollapsed && (
        <div className="playlists-section">
          <div className="playlists-header">PLAYLISTS</div>
          <div className="playlists-list">
            {playlists.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '12px' }}>
                No playlists yet
              </div>
            ) : (
              playlists.map(playlist => (
                <div 
                  key={playlist.id} 
                  className="playlist-item"
                  onClick={() => onNavigate(`playlist-${playlist.id}`)}
                  onContextMenu={(e) => handleContextMenu(e, playlist.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="playlist-icon">
                    {playlist.customArtwork ? (
                      <img src={playlist.customArtwork} alt={playlist.name} style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} />
                    ) : (
                      <div className="playlist-image">🎵</div>
                    )}
                  </div>
                  <div className="playlist-info">
                    <div className="playlist-name">{playlist.name}</div>
                    <div className="playlist-count">{playlist.tracks.length} songs</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Collapsed Playlists - show only icons */}
      {isCollapsed && playlists.length > 0 && (
        <div className="playlists-section-collapsed" style={{ padding: '8px 0' }}>
          {playlists.map(playlist => (
            <div 
              key={playlist.id}
              onClick={() => onNavigate(`playlist-${playlist.id}`)}
              title={playlist.name}
              style={{
                padding: '8px',
                display: 'flex',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {playlist.customArtwork ? (
                <img src={playlist.customArtwork} alt={playlist.name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', background: '#2a2a2a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  🎵
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div 
            style={{
              background: '#181818',
              borderRadius: '12px',
              padding: '24px',
              width: '400px',
              maxWidth: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#fff', marginBottom: '20px', fontSize: '20px' }}>Create Playlist</h2>
            
            {/* Artwork Upload */}
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <div 
                onClick={() => handleSelectArtwork(false)}
                style={{
                  width: '200px',
                  height: '200px',
                  margin: '0 auto',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed #3a3a3a',
                  transition: 'border-color 0.2s',
                  overflow: 'hidden',
                  background: '#2a2a2a'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#22c55e'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#3a3a3a'}
              >
                {newPlaylistArtwork ? (
                  <img src={newPlaylistArtwork} alt="Playlist cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#888' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 8px' }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <div style={{ fontSize: '12px' }}>Click to add cover</div>
                  </div>
                )}
              </div>
            </div>
            
            <input
              type="text"
              placeholder="Playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                marginBottom: '12px',
                outline: 'none'
              }}
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={newPlaylistDesc}
              onChange={(e) => setNewPlaylistDesc(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                marginBottom: '20px',
                outline: 'none',
                resize: 'vertical',
                minHeight: '80px'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid #3a3a3a',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                style={{
                  padding: '10px 20px',
                  background: newPlaylistName.trim() ? '#22c55e' : '#2a2a2a',
                  border: 'none',
                  borderRadius: '6px',
                  color: newPlaylistName.trim() ? '#000' : '#666',
                  cursor: newPlaylistName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Playlist Modal */}
      {editingPlaylist && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setEditingPlaylist(null)}
        >
          <div 
            style={{
              background: '#181818',
              borderRadius: '12px',
              padding: '24px',
              width: '400px',
              maxWidth: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#fff', marginBottom: '20px', fontSize: '20px' }}>Edit Playlist</h2>
            
            {/* Artwork Upload */}
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <div 
                onClick={() => handleSelectArtwork(true)}
                style={{
                  width: '200px',
                  height: '200px',
                  margin: '0 auto',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px dashed #3a3a3a',
                  transition: 'border-color 0.2s',
                  overflow: 'hidden',
                  background: '#2a2a2a'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#22c55e'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = '#3a3a3a'}
              >
                {editingPlaylist.artwork ? (
                  <img src={editingPlaylist.artwork} alt="Playlist cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#888' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 8px' }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="M21 15l-5-5L5 21"/>
                    </svg>
                    <div style={{ fontSize: '12px' }}>Click to change cover</div>
                  </div>
                )}
              </div>
            </div>
            
            <input
              type="text"
              placeholder="Playlist name"
              value={editingPlaylist.name}
              onChange={(e) => setEditingPlaylist({ ...editingPlaylist, name: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                marginBottom: '12px',
                outline: 'none'
              }}
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={editingPlaylist.description}
              onChange={(e) => setEditingPlaylist({ ...editingPlaylist, description: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2a2a2a',
                border: '1px solid #3a3a3a',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '14px',
                marginBottom: '20px',
                outline: 'none',
                resize: 'vertical',
                minHeight: '80px'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingPlaylist(null)}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  border: '1px solid #3a3a3a',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editingPlaylist.name.trim()}
                style={{
                  padding: '10px 20px',
                  background: editingPlaylist.name.trim() ? '#22c55e' : '#2a2a2a',
                  border: 'none',
                  borderRadius: '6px',
                  color: editingPlaylist.name.trim() ? '#000' : '#666',
                  cursor: editingPlaylist.name.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Theme toggle - at the bottom */}
      {!isCollapsed ? (
        <div className="sidebar-theme-toggle">
          <div className="theme-divider"></div>
          <button className="theme-toggle-btn" onClick={onToggleDarkMode}>
            <div className={`toggle-track ${isDarkMode ? 'dark' : 'light'}`}>
              <div className="toggle-thumb">
                {isDarkMode ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="5"/>
                    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                )}
              </div>
            </div>
            <span className="theme-label">{isDarkMode ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
            style={{
              width: '100%',
              padding: '10px 0',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hover-bg)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            {isDarkMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: '#282828',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
            minWidth: '160px',
            padding: '4px 0'
          }}
        >
          <button
            onClick={() => handleEditPlaylist(contextMenu.playlistId)}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#3a3a3a'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Edit
          </button>
          <button
            onClick={() => handleDeletePlaylist(contextMenu.playlistId)}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              color: '#ff4444',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#3a3a3a'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            Delete
          </button>
        </div>
      )}

    </div>
  )
}

export default Sidebar
