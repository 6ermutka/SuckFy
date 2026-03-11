import React from 'react'
import '../../styles/PlaylistView.css'
import { useLibrary } from '../../contexts/LibraryContext'
import { usePlayer } from '../../contexts/PlayerContext'
import { RepeatMode } from '../../types'
import { getPlaceholderSVG } from '../../utils/placeholderImage'
import { getDisplayURLSync } from '../../utils/fileURL'

interface PlaylistViewProps {
  playlistId: string
}

const PlaylistView: React.FC<PlaylistViewProps> = ({ playlistId }) => {
  const { playlists, toggleLike, isLiked, removeFromPlaylist } = useLibrary()
  const { play, currentTrack, isPlaying, setQueue, isShuffle, repeatMode } = usePlayer()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'spotify' | 'soundcloud'>('all')

  const playlist = playlists.find(p => p.id === playlistId)

  if (!playlist) {
    return (
      <div className="playlist-view">
        <div className="empty-state">
          <h3>Playlist not found</h3>
        </div>
      </div>
    )
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // const getSourceBadge = (source: string) => {
  //   const lowerSource = source.toLowerCase()
  //   switch (lowerSource) {
  //     case 'spotify':
  //       return { label: 'Spotify', color: '#22c55e', icon: '●' }
  //     case 'soundcloud':
  //       return { label: 'SoundCloud', color: '#ff8800', icon: '☁' }
  //     default:
  //       return { label: source, color: '#888', icon: '●' }
  //   }
  // }

  const filteredTracks = playlist.tracks.filter(track => {
    const source = track.source.toLowerCase()
    if (activeFilter !== 'all' && source !== activeFilter) return false
    if (searchQuery && 
        !track.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !track.artist.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const handlePlayAll = () => {
    if (filteredTracks.length > 0) {
      if (filteredTracks.length > 1) {
        setQueue(filteredTracks.slice(1))
      } else {
        setQueue([])
      }
      play(filteredTracks[0])
    }
  }

  const handleShuffle = () => {
    if (filteredTracks.length > 0) {
      const shuffled = [...filteredTracks].sort(() => Math.random() - 0.5)
      if (shuffled.length > 1) {
        setQueue(shuffled.slice(1))
      } else {
        setQueue([])
      }
      play(shuffled[0])
    }
  }

  const handlePlayTrack = (track: any) => {
    const trackIndex = filteredTracks.findIndex(t => t.id === track.id)
    if (trackIndex === -1) {
      play(track)
      return
    }
    
    // Build queue based on shuffle and repeat state
    let tracksToQueue = []
    
    if (isShuffle) {
      // Shuffle mode: shuffle all tracks except the current one
      const otherTracks = [...filteredTracks.slice(0, trackIndex), ...filteredTracks.slice(trackIndex + 1)]
      tracksToQueue = otherTracks.sort(() => Math.random() - 0.5)
    } else {
      // Normal mode: play in order after current track
      tracksToQueue = filteredTracks.slice(trackIndex + 1)
      
      // If repeat all is on, add tracks from beginning
      if (repeatMode === RepeatMode.ALL) {
        tracksToQueue = [...tracksToQueue, ...filteredTracks.slice(0, trackIndex)]
      }
    }
    
    setQueue(tracksToQueue)
    play(track)
  }

  const totalDuration = playlist.tracks.reduce((sum, track) => sum + track.duration, 0)
  const totalMinutes = Math.floor(totalDuration / 60)

  return (
    <div className="playlist-view">
      <div className="content-wrapper">
        {/* Header */}
        <div className="playlist-header">
          <div className="playlist-cover" style={{ width: '232px', height: '232px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
            {playlist.customArtwork ? (
              <img src={playlist.customArtwork} alt={playlist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
            )}
          </div>
          <div className="playlist-info">
            <div className="playlist-type">PLAYLIST</div>
            <h1 className="playlist-title">{playlist.name}</h1>
            {playlist.description && (
              <div className="playlist-description">{playlist.description}</div>
            )}
            <div className="playlist-stats">
              {playlist.tracks.length} songs • {totalMinutes} min
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="library-controls" style={{ marginBottom: '16px' }}>
          <div className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search in playlist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="filter-chips">
            <button 
              className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-chip spotify ${activeFilter === 'spotify' ? 'active' : ''}`}
              onClick={() => setActiveFilter('spotify')}
            >
              ● Spotify
            </button>
            <button 
              className={`filter-chip soundcloud ${activeFilter === 'soundcloud' ? 'active' : ''}`}
              onClick={() => setActiveFilter('soundcloud')}
            >
              ☁ SoundCloud
            </button>
          </div>

          <div className="action-buttons" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button 
              className="action-button play"
              onClick={handlePlayAll}
              disabled={filteredTracks.length === 0}
              style={{
                padding: '14px 32px',
                borderRadius: '50px',
                background: '#22c55e',
                border: 'none',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: filteredTracks.length > 0 ? 'pointer' : 'not-allowed',
                opacity: filteredTracks.length > 0 ? 1 : 0.5,
                transition: 'all 0.2s',
                fontSize: '14px',
                fontWeight: 600
              }}
              onMouseEnter={(e) => {
                if (filteredTracks.length > 0) {
                  e.currentTarget.style.transform = 'scale(1.04)'
                  e.currentTarget.style.background = '#1ed760'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.background = '#22c55e'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Play
            </button>
            <button 
              className="action-button shuffle"
              onClick={handleShuffle}
              disabled={filteredTracks.length === 0}
              style={{
                padding: '14px 32px',
                borderRadius: '50px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: filteredTracks.length > 0 ? 'pointer' : 'not-allowed',
                opacity: filteredTracks.length > 0 ? 1 : 0.5,
                transition: 'all 0.2s',
                fontSize: '14px',
                fontWeight: 600
              }}
              onMouseEnter={(e) => {
                if (filteredTracks.length > 0) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.transform = 'scale(1.04)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
              </svg>
              Shuffle
            </button>
          </div>
        </div>

        {/* Tracks List */}
        {playlist.tracks.length === 0 ? (
          <div className="empty-state">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <h3>This playlist is empty</h3>
            <p>Add songs by clicking the + button in the player</p>
          </div>
        ) : (
          <div className="tracks-list">
            {filteredTracks.map((track, index) => {
              const isCurrentTrack = currentTrack?.id === track.id
              const isCurrentPlaying = isCurrentTrack && isPlaying
              
              return (
                <div 
                  key={track.id + '-' + index} 
                  className={`track-row ${isCurrentTrack ? 'active' : ''}`}
                  onClick={() => handlePlayTrack(track)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="track-play-indicator">
                    {isCurrentPlaying ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                      </svg>
                    ) : (
                      <span className="track-number" style={{ color: isCurrentTrack ? '#22c55e' : 'var(--text-primary)' }}>
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="track-artwork">
                    <img 
                      src={getDisplayURLSync(track.artworkURL) || getPlaceholderSVG(48)} 
                      alt={track.title}
                      style={{ width: '48px', height: '48px', borderRadius: '4px' }}
                    />
                  </div>
                  <div className="track-info">
                    <div className="track-title" style={{ color: isCurrentTrack ? '#22c55e' : 'var(--text-primary)' }}>
                      {track.title}
                    </div>
                    <div className="track-artist">{track.artist}</div>
                  </div>
                  <button 
                    className={`track-like ${isLiked(track.id) ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLike(track)
                    }}
                    style={{
                      color: isLiked(track.id) ? '#22c55e' : '#888'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked(track.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </button>
                  <div className="track-duration">{formatDuration(track.duration)}</div>
                  <button 
                    className="track-remove"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Remove "${track.title}" from playlist "${playlist.name}"?`)) {
                        removeFromPlaylist(playlist.id, track.id)
                      }
                    }}
                    title="Remove from playlist"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default PlaylistView
