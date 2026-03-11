import React, { useState, useEffect, useRef, useCallback } from 'react'
import '../styles/Player.css'
import { usePlayer } from '../contexts/PlayerContext'
import { useLibrary } from '../contexts/LibraryContext'
import { RepeatMode } from '../types'
import { getDisplayURLSync } from '../utils/fileURL'

const Player: React.FC = () => {
  const { 
    currentTrack, 
    isPlaying, 
    progress, 
    currentTime, 
    duration, 
    volume, 
    isShuffle, 
    repeatMode,
    showQueue,
    playPause,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    toggleRepeat,
    toggleQueue
  } = usePlayer()

  const { isLiked, toggleLike, playlists, addToPlaylist } = useLibrary()

  // Download progress state
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [downloadStatus, setDownloadStatus] = useState<string>('')
  
  // Playlist modal state
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)

  // Drag state for sliders
  const isDraggingProgress = useRef(false)
  const isDraggingVolume = useRef(false)
  const progressBarRef = useRef<HTMLDivElement>(null)
  const volumeSliderRef = useRef<HTMLDivElement>(null)

  const getProgressFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!progressBarRef.current) return null
    const rect = progressBarRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    return Math.max(0, Math.min(1, x / rect.width))
  }, [])

  const getVolumeFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!volumeSliderRef.current) return null
    const rect = volumeSliderRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    return Math.max(0, Math.min(1, x / rect.width))
  }, [])

  const handleProgressMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    isDraggingProgress.current = true
    progressBarRef.current?.classList.add('dragging')
    const pct = getProgressFromEvent(e)
    if (pct !== null) seek(pct * duration)

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingProgress.current) return
      const pct = getProgressFromEvent(e)
      if (pct !== null) seek(pct * duration)
    }
    const onMouseUp = (e: MouseEvent) => {
      isDraggingProgress.current = false
      progressBarRef.current?.classList.remove('dragging')
      const pct = getProgressFromEvent(e)
      if (pct !== null) seek(pct * duration)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [duration, seek, getProgressFromEvent])

  const handleVolumeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    isDraggingVolume.current = true
    volumeSliderRef.current?.classList.add('dragging')
    const vol = getVolumeFromEvent(e)
    if (vol !== null) setVolume(vol)

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingVolume.current) return
      const vol = getVolumeFromEvent(e)
      if (vol !== null) setVolume(vol)
    }
    const onMouseUp = (e: MouseEvent) => {
      isDraggingVolume.current = false
      volumeSliderRef.current?.classList.remove('dragging')
      const vol = getVolumeFromEvent(e)
      if (vol !== null) setVolume(vol)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [setVolume, getVolumeFromEvent])

  useEffect(() => {
    const handleProgress = (data: { trackId: string; progress: number; downloaded?: number; total?: number }) => {
      if (currentTrack && data.trackId === currentTrack.id) {
        // Handle error state
        if (data.progress < 0) {
          setDownloadStatus('Download failed!')
          setDownloadProgress(null)
          setTimeout(() => {
            setDownloadStatus('')
          }, 3000)
          return
        }
        
        setDownloadProgress(data.progress)
        
        // Update status based on progress
        if (data.progress === 0 || data.progress < 5) {
          setDownloadStatus('Connecting to song.link...')
        } else if (data.progress < 10) {
          setDownloadStatus('Searching track on song.link...')
        } else if (data.progress < 15) {
          setDownloadStatus('Finding Tidal link...')
        } else if (data.progress < 100) {
          setDownloadStatus(`Downloading... ${Math.round(data.progress)}%`)
        } else if (data.progress >= 100) {
          setDownloadStatus('Download complete!')
          setTimeout(() => {
            setDownloadProgress(null)
            setDownloadStatus('')
          }, 2000)
        }
      }
    }

    // Listen for download progress events from Electron IPC
    if (window.electron?.download) {
      // @ts-ignore
      window.electron.download.onDownloadProgress?.(handleProgress)
    }

    // Listen for custom download progress events
    const handleCustomProgress = (event: Event) => {
      const customEvent = event as CustomEvent
      if (customEvent.detail) {
        handleProgress(customEvent.detail)
      }
    }

    window.addEventListener('download-progress', handleCustomProgress)

    return () => {
      setDownloadProgress(null)
      setDownloadStatus('')
      window.removeEventListener('download-progress', handleCustomProgress)
    }
  }, [currentTrack])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Debug log
  console.log('🎵 [PLAYER UI] Current track:', currentTrack?.title, 'Artist:', currentTrack?.artist, 'Playing:', isPlaying, 'Full track:', currentTrack)

  return (
    <div className="player">
      {/* Track Info */}
      <div className="player-track-info">
        <div className="player-artwork">
          {currentTrack?.artworkURL ? (
            <img src={getDisplayURLSync(currentTrack.artworkURL)} alt="Album artwork" />
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          )}
        </div>
        <div className="player-details">
          <div className="player-track-name">
            {currentTrack?.title || 'No track playing'}
          </div>
          <div className="player-artist-name">
            {currentTrack?.artist || 'Unknown artist'}
          </div>
        </div>
        <button
          className={`player-like ${currentTrack && isLiked(currentTrack.id) ? 'active' : ''}`}
          onClick={() => currentTrack && toggleLike(currentTrack)}
          disabled={!currentTrack}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={currentTrack && isLiked(currentTrack.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
        <button
          className="player-add-to-playlist"
          disabled={!currentTrack}
          title="Add to playlist"
          onClick={() => setShowPlaylistModal(true)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
        
        {/* Add to Playlist Modal */}
        {showPlaylistModal && currentTrack && (
          <div className="playlist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="playlist-modal-header">Add to playlist</div>
            {playlists.length === 0 ? (
              <div className="playlist-modal-empty">No playlists yet</div>
            ) : (
              playlists.map(playlist => (
                <div
                  key={playlist.id}
                  className="playlist-modal-item"
                  onClick={() => {
                    addToPlaylist(playlist.id, currentTrack)
                    setShowPlaylistModal(false)
                  }}
                >
                  {playlist.name}
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Backdrop to close modal */}
        {showPlaylistModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999
            }}
            onClick={() => setShowPlaylistModal(false)}
          />
        )}
        <button className={`player-queue ${showQueue ? 'active' : ''}`} onClick={toggleQueue}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18"/>
          </svg>
        </button>
      </div>

      {/* Controls */}
      <div className="player-controls">
        <div className="player-buttons">
          <button onClick={toggleShuffle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isShuffle ? '#22c55e' : 'var(--text-secondary)', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
            </svg>
          </button>

          <button onClick={previous} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button onClick={playPause} style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)',
            flexShrink: 0,
          }}>
            {isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          <button onClick={next} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 18h2V6h-2zm-3.5-6L4 6v12z"/>
            </svg>
          </button>

          <button onClick={toggleRepeat} style={{ background: 'none', border: 'none', cursor: 'pointer', color: repeatMode !== RepeatMode.OFF ? '#22c55e' : 'var(--text-secondary)', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {repeatMode === RepeatMode.ONE ? (
              /* Repeat ONE — иконка repeat с цифрой 1 */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                <text x="12" y="14" textAnchor="middle" fontSize="7" fontWeight="bold" fill="currentColor">1</text>
              </svg>
            ) : (
              /* Repeat ALL или OFF — обычная иконка repeat */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
              </svg>
            )}
          </button>
        </div>

        {/* Download Progress Indicator - Above playback progress */}
        {downloadProgress !== null && downloadStatus && (
          <div className="download-status-inline">
            <div className="download-status-text">{downloadStatus}</div>
            <div className="download-progress-bar-inline">
              <div 
                className="download-progress-fill" 
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="player-progress">
          <div className="progress-time">{formatTime(currentTime)}</div>
          <div
            className="progress-bar-container"
            ref={progressBarRef}
            onMouseDown={handleProgressMouseDown}
          >
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}>
                <div className="progress-thumb"></div>
              </div>
            </div>
          </div>
          <div className="progress-time">-{formatTime(duration - currentTime)}</div>
        </div>
      </div>

      {/* Volume & Extra Controls */}
      <div className="player-extra-controls">
        <div className="volume-control">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            {volume === 0 ? (
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            ) : volume < 0.5 ? (
              <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
            ) : (
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            )}
          </svg>
          <div
            className="volume-slider"
            ref={volumeSliderRef}
            onMouseDown={handleVolumeMouseDown}
          >
            <div className="volume-fill" style={{ width: `${volume * 100}%` }}></div>
            <div className="volume-thumb" style={{ left: `${volume * 100}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Player
