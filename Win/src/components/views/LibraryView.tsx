import React, { useState, useEffect } from 'react'
import '../../styles/LibraryView.css'
import { useLibrary } from '../../contexts/LibraryContext'
import { usePlayer } from '../../contexts/PlayerContext'
import { RepeatMode } from '../../types'
import { getPlaceholderSVG } from '../../utils/placeholderImage'
import { getDisplayURLSync } from '../../utils/fileURL'

const LibraryView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'spotify' | 'soundcloud'>('all')
  const { downloadedTracks, removeDownloadedTrack } = useLibrary()
  const { play, currentTrack, isPlaying, setQueue, isShuffle, repeatMode } = usePlayer()
  const [tracksWithSize, setTracksWithSize] = useState<any[]>([])
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set())

  // Get file sizes for downloaded tracks
  useEffect(() => {
    const updateSizes = async () => {
      const updated = await Promise.all(
        downloadedTracks.map(async (track) => ({
          ...track,
          size: 'Unknown' // Placeholder for now
        }))
      )
      setTracksWithSize(updated)
    }

    updateSizes()
  }, [downloadedTracks])

  const filteredTracks = tracksWithSize.filter(track => {
    const source = track.source.toLowerCase()
    if (activeFilter !== 'all' && source !== activeFilter) return false
    if (searchQuery && 
        !track.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !track.artist.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getSourceBadge = (source: string) => {
    const lowerSource = source.toLowerCase()
    switch (lowerSource) {
      case 'spotify':
        return { label: 'Spotify', color: '#22c55e', icon: '●' }
      case 'soundcloud':
        return { label: 'SoundCloud', color: '#ff8800', icon: '☁' }
      default:
        return { label: source, color: '#888', icon: '●' }
    }
  }

  const handlePlayAll = () => {
    if (filteredTracks.length > 0) {
      // Set queue with all tracks except first
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
      // Shuffle the tracks array
      const shuffled = [...filteredTracks].sort(() => Math.random() - 0.5)
      console.log('🔀 [LIBRARY] Shuffling tracks. Total:', shuffled.length)
      // Set queue with all shuffled tracks except first
      if (shuffled.length > 1) {
        setQueue(shuffled.slice(1))
        console.log('🔀 [LIBRARY] Queue set with', shuffled.length - 1, 'tracks')
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
    
    console.log('▶️ [LIBRARY] Playing track at index:', trackIndex, 'Shuffle:', isShuffle, 'Repeat:', repeatMode)
    
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
    
    console.log('▶️ [LIBRARY] Queue set with', tracksToQueue.length, 'tracks')
    setQueue(tracksToQueue)
    play(track)
  }

  return (
    <div className="library-view">
      <div className="view-container">
        {/* Header */}
        <div className="library-header">
          <div className="library-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 6h2v12H4V6zm4 0h2v12H8V6zm4 0h6v12h-6V6z"/>
            </svg>
          </div>
          <div className="library-info">
            <div className="library-label">MY LIBRARY</div>
            <h1 className="library-title">Library</h1>
            <div className="library-stats">{downloadedTracks.length} tracks</div>
          </div>
          <button 
            className="select-button"
            onClick={() => {
              setIsSelectMode(!isSelectMode)
              setSelectedTracks(new Set())
            }}
          >
            {isSelectMode ? 'Cancel' : 'Select'}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="library-controls">
          <div className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search in library..."
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
            {isSelectMode && selectedTracks.size > 0 && (
              <button 
                className="action-button delete"
                onClick={() => {
                  if (confirm(`Delete ${selectedTracks.size} selected tracks completely from library?`)) {
                    selectedTracks.forEach(trackId => removeDownloadedTrack(trackId))
                    setSelectedTracks(new Set())
                    setIsSelectMode(false)
                  }
                }}
                style={{
                  padding: '14px 32px',
                  borderRadius: '50px',
                  background: '#ff4444',
                  border: 'none',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px',
                  fontWeight: 600
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.04)'
                  e.currentTarget.style.background = '#ee3333'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.background = '#ff4444'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
                Delete ({selectedTracks.size})
              </button>
            )}
            <button 
              className="action-button play"
              onClick={handlePlayAll}
              disabled={filteredTracks.length === 0 || isSelectMode}
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
              disabled={filteredTracks.length === 0 || isSelectMode}
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
        {filteredTracks.length === 0 ? (
          <div className="empty-state">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
            </svg>
            <h3>No downloaded tracks</h3>
            <p>Tracks you download will appear here</p>
          </div>
        ) : (
          <div className="tracks-list">
            {filteredTracks.map((track, index) => {
              const isCurrentTrack = currentTrack?.id === track.id
              const isCurrentPlaying = isCurrentTrack && isPlaying
              
              return (
                <div 
                  key={track.id} 
                  className={`track-row ${isCurrentTrack ? 'active' : ''} ${selectedTracks.has(track.id) ? 'selected' : ''}`}
                  onClick={() => {
                    if (isSelectMode) {
                      const newSelected = new Set(selectedTracks)
                      if (newSelected.has(track.id)) {
                        newSelected.delete(track.id)
                      } else {
                        newSelected.add(track.id)
                      }
                      setSelectedTracks(newSelected)
                    } else {
                      handlePlayTrack(track)
                    }
                  }}
                  style={{ cursor: 'pointer', background: selectedTracks.has(track.id) ? 'rgba(34, 197, 94, 0.1)' : undefined }}
                >
                  <div className="track-number" style={{ color: isCurrentTrack ? '#22c55e' : 'var(--text-primary)' }}>
                    {isSelectMode ? (
                      <input 
                        type="checkbox" 
                        checked={selectedTracks.has(track.id)}
                        onChange={() => {}}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    ) : isCurrentPlaying ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                      </svg>
                    ) : (
                      index + 1
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
                  <div className="track-source">
                    <span 
                      className={`source-badge ${track.source}`}
                      style={{ color: getSourceBadge(track.source).color }}
                    >
                      {getSourceBadge(track.source).icon} {getSourceBadge(track.source).label}
                    </span>
                  </div>
                  <div className="track-duration">{formatDuration(track.duration)}</div>
                  <button 
                    className="track-delete" 
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Delete "${track.title}" completely from library?`)) {
                        removeDownloadedTrack(track.id)
                      }
                    }}
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

export default LibraryView
