import React from 'react'
import '../../styles/HomeView.css'
import { useLibrary } from '../../contexts/LibraryContext'
import { usePlayer } from '../../contexts/PlayerContext'
import { getDisplayURLSync } from '../../utils/fileURL'

const HomeView: React.FC = () => {
  const { recentlyPlayed, likedSongs } = useLibrary()
  const { play } = usePlayer()

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="home-view">
      <div className="view-container">
        <h1 className="greeting">{getGreeting()}</h1>

        {/* Recently Played */}
        {recentlyPlayed.length > 0 && (
          <section className="section">
            <h2 className="section-title">Recently Played</h2>
            <div className="recently-played-grid">
              {recentlyPlayed.slice(0, 6).map(track => (
                <div key={track.id} className="track-card" onClick={() => play(track)}>
                  <div className="track-card-image">
                    <img src={getDisplayURLSync(track.artworkURL) || 'https://via.placeholder.com/150'} alt={track.title} />
                    <button className="play-button">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>
                  <div className="track-card-info">
                    <div className="track-card-title">{track.title}</div>
                    <div className="track-card-artist">{track.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Liked Songs */}
        {likedSongs.length > 0 && (
          <section className="section">
            <h2 className="section-title">Liked Songs</h2>
            <div className="liked-songs-grid">
              {likedSongs.slice(0, 6).map(track => (
                <div key={track.id} className="quick-track-tile" onClick={() => play(track)}>
                  <div className="quick-track-artwork">
                    {track.artworkURL ? (
                      <img src={getDisplayURLSync(track.artworkURL)} alt={track.title} />
                    ) : (
                      <div className="artwork-placeholder">🎵</div>
                    )}
                  </div>
                  <div className="quick-track-info">
                    <div className="quick-track-title">{track.title}</div>
                    <div className="quick-track-artist">{track.artist}</div>
                  </div>
                  <svg className="quick-track-play" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state when no content */}
        {recentlyPlayed.length === 0 && likedSongs.length === 0 && (
          <div className="home-empty-state">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <path d="M9 18V5l12-2v13M9 18c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm12-2c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3z"/>
            </svg>
            <h3>Start discovering music</h3>
            <p>Search for tracks and add them to your library</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default HomeView
