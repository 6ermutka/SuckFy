import React from 'react'
import '../styles/QueueView.css'
import { usePlayer } from '../contexts/PlayerContext'
import { getDisplayURLSync } from '../utils/fileURL'
import { getPlaceholderSVG } from '../utils/placeholderImage'

const QueueView: React.FC = () => {
  const { currentTrack, queue, showQueue, toggleQueue, removeFromQueue } = usePlayer()
  
  if (!showQueue) return null
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="queue-view">
      {/* Header */}
      <div className="queue-header">
        <h3 className="queue-title">Queue</h3>
        <button className="queue-close" onClick={toggleQueue}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Now Playing */}
      {currentTrack && (
        <div className="now-playing-section">
          <div className="section-label">Now Playing</div>
          <div className="now-playing-track">
            <div className="track-artwork">
              <img src={getDisplayURLSync(currentTrack.artworkURL) || getPlaceholderSVG(56)} alt={currentTrack.title} />
              <div className="playing-indicator">
                <div className="bar"></div>
                <div className="bar"></div>
                <div className="bar"></div>
              </div>
            </div>
            <div className="track-info">
              <div className="track-title">{currentTrack.title}</div>
              <div className="track-artist">{currentTrack.artist}</div>
            </div>
          </div>
        </div>
      )}

      {/* Next in Queue */}
      <div className="queue-section">
        <div className="section-label">Next in Queue ({queue.length})</div>
        {queue.length === 0 ? (
          <div className="queue-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <path d="M3 6h18M3 12h18M3 18h18"/>
            </svg>
            <p>Queue is empty</p>
          </div>
        ) : (
          <div className="queue-list">
            {queue.map((track, index) => (
              <div key={`${track.id}-${index}`} className="queue-track">
                <div className="queue-track-number">{index + 1}</div>
                <div className="queue-track-artwork">
                  <img src={getDisplayURLSync(track.artworkURL) || getPlaceholderSVG(40)} alt={track.title} style={{ width: '40px', height: '40px', borderRadius: '4px' }} />
                </div>
                <div className="queue-track-info">
                  <div className="queue-track-title">{track.title}</div>
                  <div className="queue-track-artist">{track.artist}</div>
                </div>
                <div className="queue-track-duration">{formatDuration(track.duration)}</div>
                <button className="queue-track-remove" onClick={() => removeFromQueue(index)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default QueueView
