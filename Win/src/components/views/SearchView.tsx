import React, { useState, useEffect } from 'react'
import '../../styles/SearchView.css'
import { Track } from '../../types'
import { spotifyService } from '../../services/SpotifyService'
import { soundCloudService } from '../../services/SoundCloudService'
import { downloadService } from '../../services/DownloadService'
import { usePlayer } from '../../contexts/PlayerContext'
import { useLibrary } from '../../contexts/LibraryContext'
import { getPlaceholderSVG } from '../../utils/placeholderImage'
import { getDisplayURLSync } from '../../utils/fileURL'

const SearchView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'spotify' | 'soundcloud'>('spotify')
  const [searchQuery, setSearchQuery] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingTracks, setDownloadingTracks] = useState<Set<string>>(new Set())
  const [soundCloudAuth, setSoundCloudAuth] = useState(false)
  const [showTokenInput, setShowTokenInput] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [isSavingToken, setIsSavingToken] = useState(false)

  const { play } = usePlayer()
  const { isLiked, toggleLike, addDownloadedTrack } = useLibrary()

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    // Check if SoundCloud is authenticated
    const isAuth = soundCloudService.hasAuth()
    setSoundCloudAuth(isAuth)
  }, [])

  const handleSoundCloudLogin = () => {
    setShowTokenInput(true)
  }

  const handleSaveToken = async () => {
    if (tokenInput.trim()) {
      setIsSavingToken(true)
      try {
        // Fetch username from SoundCloud API v2
        const response = await fetch('https://api-v2.soundcloud.com/me', {
          headers: {
            'Authorization': `OAuth ${tokenInput.trim()}`,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        })
        
        if (!response.ok) {
          throw new Error('Invalid token or API error')
        }
        
        const userData = await response.json()
        const username = userData.username || 'SoundCloud User'
        
        // Save token with fetched username
        soundCloudService.saveToken(tokenInput.trim(), username)
        setSoundCloudAuth(true)
        setShowTokenInput(false)
        setTokenInput('')
        setIsSavingToken(false)
        alert(`SoundCloud OAuth token saved! Connected as ${username}`)
      } catch (error) {
        console.error('Failed to fetch user data:', error)
        setIsSavingToken(false)
        alert('Failed to validate token. Please check your OAuth token.')
      }
    }
  }

  const handleSoundCloudLogout = () => {
    localStorage.removeItem('soundcloud_oauth_token')
    localStorage.removeItem('soundcloud_username')
    soundCloudService.saveToken('', '')
    setSoundCloudAuth(false)
  }


  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)
    setSearchResults([])

    try {
      let results: Track[]
      
      if (activeTab === 'spotify') {
        // Uses iTunes API - no credentials needed!
        results = await spotifyService.search(searchQuery)
      } else {
        // SoundCloud requires OAuth
        if (!soundCloudService.hasAuth()) {
          setError('SoundCloud login required. Please configure in Settings.')
          return
        }
        results = await soundCloudService.search(searchQuery)
      }

      setSearchResults(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
      console.error('Search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handlePlayFromLink = async () => {
    if (!linkInput.trim()) return

    setIsSearching(true)
    setError(null)

    try {
      let track: Track

      if (activeTab === 'spotify') {
        // Get track from Spotify URL via song.link
        track = await spotifyService.getTrackFromUrl(linkInput)
      } else {
        // SoundCloud requires OAuth
        if (!soundCloudService.hasAuth()) {
          setError('SoundCloud login required. Please configure in Settings.')
          return
        }
        track = await soundCloudService.getTrackFromUrl(linkInput)
      }

      // Download and play
      await handleDownloadAndPlay(track)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get track from link')
      console.error('Link error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleDownloadAndPlay = async (track: Track) => {
    try {
      console.log('🎵 [SEARCH] Click on track:', track.title, 'Artist:', track.artist, 'ID:', track.id)
      
      // DON'T play yet - wait for download
      // Just show track info in player without audio
      const trackWithoutAudio = { ...track, localURL: undefined }
      play(trackWithoutAudio)
      
      // Start downloading
      setDownloadingTracks(prev => new Set(prev).add(track.id))
      
      const filePath = await downloadService.downloadTrack(track, (progress) => {
        console.log(`Downloading ${track.title}: ${progress}%`)
      })

      // Update track with local file path
      const downloadedTrack = { ...track, localURL: filePath, isDownloaded: true }
      
      console.log('🎵 [SEARCH] Downloaded track object:', downloadedTrack)
      
      // Add to library
      console.log('📚 [SEARCH] Adding to library:', downloadedTrack.title, downloadedTrack.id)
      addDownloadedTrack(downloadedTrack)
      
      // Verify it was saved
      setTimeout(() => {
        const saved = localStorage.getItem('downloaded_tracks')
        console.log('📚 [SEARCH] Verify saved tracks:', saved)
      }, 100)
      
      // NOW play the downloaded track with file
      console.log('🎵 [SEARCH] Playing downloaded track with file:', filePath)
      play(downloadedTrack)
      
      setDownloadingTracks(prev => {
        const next = new Set(prev)
        next.delete(track.id)
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
      setDownloadingTracks(prev => {
        const next = new Set(prev)
        next.delete(track.id)
        return next
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="search-view">
      <div className="view-container">
        {/* Tabs */}
        <div className="search-tabs">
          <button 
            className={`tab ${activeTab === 'spotify' ? 'active' : ''}`}
            onClick={() => setActiveTab('spotify')}
          >
            Spotify
          </button>
          <button 
            className={`tab ${activeTab === 'soundcloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('soundcloud')}
          >
            SoundCloud
          </button>
          {activeTab === 'soundcloud' && (
            soundCloudAuth ? (
              <button 
                className="soundcloud-token-btn authenticated"
                onClick={handleSoundCloudLogout}
                style={{
                  marginLeft: 'auto',
                  padding: '6px 16px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '6px',
                  color: '#22c55e',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                OAuth Active
              </button>
            ) : (
              <button 
                className="soundcloud-token-btn"
                onClick={handleSoundCloudLogin}
                style={{
                  marginLeft: 'auto',
                  padding: '6px 16px',
                  background: 'rgba(255, 85, 0, 0.1)',
                  border: '1px solid rgba(255, 85, 0, 0.3)',
                  borderRadius: '6px',
                  color: '#ff5500',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                Add OAuth Token
              </button>
            )
          )}
        </div>

        {/* Token Input Modal */}
        {showTokenInput && (
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
            onClick={() => setShowTokenInput(false)}
          >
            <div 
              style={{
                background: '#181818',
                borderRadius: '12px',
                padding: '24px',
                width: '500px',
                maxWidth: '90%'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ color: '#fff', marginBottom: '12px', fontSize: '20px' }}>SoundCloud OAuth Token</h2>
              <p style={{ color: '#b3b3b3', fontSize: '13px', marginBottom: '20px' }}>
                Enter your SoundCloud OAuth token. Your username will be fetched automatically.
              </p>
              <input
                type="text"
                placeholder="oauth_token_here"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                disabled={isSavingToken}
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
                  fontFamily: 'monospace',
                  opacity: isSavingToken ? 0.5 : 1
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowTokenInput(false)
                    setTokenInput('')
                    setIsSavingToken(false)
                  }}
                  disabled={isSavingToken}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '1px solid #3a3a3a',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: isSavingToken ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: isSavingToken ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveToken}
                  disabled={!tokenInput.trim() || isSavingToken}
                  style={{
                    padding: '10px 20px',
                    background: (tokenInput.trim() && !isSavingToken) ? '#ff5500' : '#2a2a2a',
                    border: 'none',
                    borderRadius: '6px',
                    color: (tokenInput.trim() && !isSavingToken) ? '#fff' : '#666',
                    cursor: (tokenInput.trim() && !isSavingToken) ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  {isSavingToken ? 'Validating...' : 'Save Token'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="search-inputs">
          <div className="search-input-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input 
              type="text" 
              className="search-input"
              placeholder="Search by track name or artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSearching}
            />
            {isSearching && <div className="search-spinner"></div>}
          </div>

          <div className="link-input-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
            </svg>
            <input 
              type="text" 
              className="link-input"
              placeholder={`Paste ${activeTab === 'spotify' ? 'Spotify' : 'SoundCloud'} track link...`}
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handlePlayFromLink()}
              disabled={isSearching}
            />
            <button 
              className="play-link-button" 
              onClick={handlePlayFromLink}
              disabled={isSearching || !linkInput.trim()}
            >
              Play
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="search-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results">
            <div className="results-header">
              <h3>Results ({searchResults.length})</h3>
            </div>
            <div className="results-list">
              {searchResults.map((track) => {
                const isDownloading = downloadingTracks.has(track.id)
                
                return (
                  <div 
                    key={track.id} 
                    className="result-item"
                    onClick={() => !isDownloading && handleDownloadAndPlay(track)}
                  >
                    <div className="result-artwork">
                      <img src={getDisplayURLSync(track.artworkURL) || getPlaceholderSVG(48)} alt={track.title} />
                    </div>
                    <div className="result-info">
                      <div className="result-title">{track.title}</div>
                      <div className="result-artist">{track.artist}</div>
                    </div>
                    <div className="result-duration">{formatDuration(track.duration)}</div>
                    {isDownloading && (
                      <div className="result-downloading">
                        <div className="download-spinner"></div>
                      </div>
                    )}
                    <button 
                      className="result-like"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLike(track)
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked(track.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                      </svg>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isSearching && searchResults.length === 0 && !error && (
          <div className="search-empty-state">
            {activeTab === 'spotify' ? (
              <>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <h3>Find your music</h3>
                <p>Search by name — or paste a Spotify link above to play instantly</p>
              </>
            ) : (
              <>
                <svg width="80" height="80" viewBox="0 0 24 24" fill="#ff8800" opacity="0.5">
                  <path d="M7 18c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm8 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                </svg>
                <h3>Search SoundCloud</h3>
                <p>Search for tracks — full downloads available</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchView
