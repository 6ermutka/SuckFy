import React, { createContext, useContext, useState, useEffect } from 'react'
import { Track, Playlist, LibraryState } from '../types'

interface LibraryContextType extends LibraryState {
  // Liked songs
  toggleLike: (track: Track) => void
  isLiked: (trackId: string) => boolean
  
  // Playlists
  createPlaylist: (name: string, description: string, artworkURL?: string) => void
  deletePlaylist: (playlistId: string) => void
  updatePlaylist: (playlistId: string, name: string, description: string, artworkURL?: string) => void
  addToPlaylist: (playlistId: string, track: Track) => void
  removeFromPlaylist: (playlistId: string, trackId: string) => void
  
  // Recently played
  addToRecentlyPlayed: (track: Track) => void
  
  // Downloaded tracks
  addDownloadedTrack: (track: Track) => void
  removeDownloadedTrack: (trackId: string) => void
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined)

export const useLibrary = () => {
  const context = useContext(LibraryContext)
  if (!context) {
    throw new Error('useLibrary must be used within LibraryProvider')
  }
  return context
}

const STORAGE_KEYS = {
  LIKED_SONGS: 'suckfy_liked_songs',
  PLAYLISTS: 'suckfy_playlists',
  RECENTLY_PLAYED: 'suckfy_recently_played',
  DOWNLOADED_TRACKS: 'suckfy_downloaded_tracks'
}

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [likedSongs, setLikedSongs] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>([])
  const [downloadedTracks, setDownloadedTracks] = useState<Track[]>([])
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Load from library metadata (JSON file in Electron) or localStorage (fallback)
  useEffect(() => {
    const loadFromStorage = async () => {
      try {
        console.log('📚 [LIBRARY] Loading library data...')
        
        // Check if we're in Electron
        if ((window as any).electron?.app?.getLibraryMetadata) {
          console.log('📚 [LIBRARY] Loading from Electron metadata...')
          const metadata = await (window as any).electron.app.getLibraryMetadata()
          
          // MIGRATION: Check if we need to migrate from localStorage
          const hasTracksInMetadata = metadata.tracks && Object.keys(metadata.tracks).length > 0
          const hasTracksInLocalStorage = localStorage.getItem(STORAGE_KEYS.DOWNLOADED_TRACKS)
          
          if (!hasTracksInMetadata && hasTracksInLocalStorage) {
            console.log('🔄 [LIBRARY] Migrating tracks from localStorage to JSON metadata...')
            const oldTracks: Track[] = JSON.parse(hasTracksInLocalStorage)
            
            // Save each track to JSON metadata
            for (const track of oldTracks) {
              await (window as any).electron.app.saveTrackMetadata(track)
            }
            console.log('✅ [LIBRARY] Migration complete:', oldTracks.length, 'tracks')
            
            // Also migrate playlists, liked songs, recently played
            const oldLiked = localStorage.getItem(STORAGE_KEYS.LIKED_SONGS)
            const oldPlaylists = localStorage.getItem(STORAGE_KEYS.PLAYLISTS)
            const oldRecent = localStorage.getItem(STORAGE_KEYS.RECENTLY_PLAYED)
            
            if (oldLiked || oldPlaylists || oldRecent) {
              await (window as any).electron.app.updateLibraryMetadata({
                likedSongs: oldLiked ? JSON.parse(oldLiked) : [],
                playlists: oldPlaylists ? JSON.parse(oldPlaylists) : [],
                recentlyPlayed: oldRecent ? JSON.parse(oldRecent) : []
              })
              console.log('✅ [LIBRARY] Migrated library metadata')
            }
            
            // Reload metadata after migration
            const updatedMetadata = await (window as any).electron.app.getLibraryMetadata()
            if (updatedMetadata.playlists) setPlaylists(updatedMetadata.playlists)
            if (updatedMetadata.likedSongs) setLikedSongs(updatedMetadata.likedSongs)
            if (updatedMetadata.recentlyPlayed) setRecentlyPlayed(updatedMetadata.recentlyPlayed)
          } else {
            // Load playlists, liked songs, recently played from metadata
            if (metadata.playlists) {
              console.log('📚 [LIBRARY] Playlists from metadata:', metadata.playlists.length)
              setPlaylists(metadata.playlists)
            }
            if (metadata.likedSongs) {
              console.log('📚 [LIBRARY] Liked songs from metadata:', metadata.likedSongs.length)
              setLikedSongs(metadata.likedSongs)
            }
            if (metadata.recentlyPlayed) {
              console.log('📚 [LIBRARY] Recently played from metadata:', metadata.recentlyPlayed.length)
              setRecentlyPlayed(metadata.recentlyPlayed)
            }
          }
          
          // Load downloaded tracks by scanning cache with metadata
          console.log('📁 [LIBRARY] Scanning cache directory for tracks...')
          const cachedTracks = await (window as any).electron.app.scanCachedTracks()
          console.log('✅ [LIBRARY] Found cached tracks with metadata:', cachedTracks.length)
          setDownloadedTracks(cachedTracks)
        } else {
          // Fallback to localStorage for web mode
          console.log('📚 [LIBRARY] Loading from localStorage (web mode)...')
          
          const liked = localStorage.getItem(STORAGE_KEYS.LIKED_SONGS)
          if (liked) setLikedSongs(JSON.parse(liked))

          const plsts = localStorage.getItem(STORAGE_KEYS.PLAYLISTS)
          if (plsts) setPlaylists(JSON.parse(plsts))

          const recent = localStorage.getItem(STORAGE_KEYS.RECENTLY_PLAYED)
          if (recent) setRecentlyPlayed(JSON.parse(recent))

          const downloaded = localStorage.getItem(STORAGE_KEYS.DOWNLOADED_TRACKS)
          if (downloaded) setDownloadedTracks(JSON.parse(downloaded))
        }
      } catch (error) {
        console.error('Error loading library data:', error)
      }
    }

    loadFromStorage().then(() => {
      // Mark initial load as complete after data is loaded
      setTimeout(() => setIsInitialLoad(false), 100)
    })
  }, [])
  
  // Listen for track played events from PlayerContext
  useEffect(() => {
    const handleTrackPlayed = (event: Event) => {
      const track = (event as CustomEvent).detail as Track
      console.log('🎧 [LIBRARY] Track played:', track.title)
      addToRecentlyPlayed(track)
    }
    
    window.addEventListener('track-played', handleTrackPlayed)
    return () => window.removeEventListener('track-played', handleTrackPlayed)
  }, [])

  // Save to JSON file (Electron) or localStorage (web mode) when data changes
  useEffect(() => {
    if (isInitialLoad) return // Don't save during initial load
    
    const saveData = async () => {
      if ((window as any).electron?.app?.updateLibraryMetadata) {
        console.log('💾 [LIBRARY] Saving liked songs to JSON:', likedSongs.length)
        await (window as any).electron.app.updateLibraryMetadata({ likedSongs })
      } else {
        localStorage.setItem(STORAGE_KEYS.LIKED_SONGS, JSON.stringify(likedSongs))
      }
    }
    saveData()
  }, [likedSongs, isInitialLoad])

  useEffect(() => {
    if (isInitialLoad) return // Don't save during initial load
    
    const saveData = async () => {
      if ((window as any).electron?.app?.updateLibraryMetadata) {
        console.log('💾 [LIBRARY] Saving playlists to JSON:', playlists.length, playlists.map(p => p.name))
        await (window as any).electron.app.updateLibraryMetadata({ playlists })
      } else {
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists))
      }
    }
    saveData()
  }, [playlists, isInitialLoad])

  useEffect(() => {
    if (isInitialLoad) return // Don't save during initial load
    
    const saveData = async () => {
      if ((window as any).electron?.app?.updateLibraryMetadata) {
        await (window as any).electron.app.updateLibraryMetadata({ recentlyPlayed })
      } else {
        localStorage.setItem(STORAGE_KEYS.RECENTLY_PLAYED, JSON.stringify(recentlyPlayed))
      }
    }
    saveData()
  }, [recentlyPlayed, isInitialLoad])

  // Note: downloadedTracks are saved individually via saveTrackMetadata when downloaded
  // No need to save the entire array here

  const toggleLike = (track: Track) => {
    setLikedSongs(prev => {
      const index = prev.findIndex(t => t.id === track.id)
      if (index >= 0) {
        console.log('💔 [LIBRARY] Removing from liked:', track.title)
        return prev.filter(t => t.id !== track.id)
      } else {
        console.log('❤️ [LIBRARY] Adding to liked:', track.title)
        return [track, ...prev]
      }
    })
  }

  const isLiked = (trackId: string) => {
    return likedSongs.some(t => t.id === trackId)
  }

  const createPlaylist = (name: string, description: string, artworkURL?: string) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      description,
      customArtwork: artworkURL,
      tracks: []
    }
    console.log('📝 [LIBRARY] Creating playlist:', name, 'ID:', newPlaylist.id)
    setPlaylists(prev => {
      const updated = [...prev, newPlaylist]
      console.log('📝 [LIBRARY] Total playlists:', updated.length)
      return updated
    })
  }

  const deletePlaylist = (playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId))
  }

  const updatePlaylist = (playlistId: string, name: string, description: string, artworkURL?: string) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId ? { ...p, name, description, customArtwork: artworkURL } : p
      )
    )
  }

  const addToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId
          ? { ...p, tracks: [...p.tracks, track] }
          : p
      )
    )
  }

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev =>
      prev.map(p =>
        p.id === playlistId
          ? { ...p, tracks: p.tracks.filter(t => t.id !== trackId) }
          : p
      )
    )
  }

  const addToRecentlyPlayed = (track: Track) => {
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(t => t.id !== track.id)
      return [track, ...filtered].slice(0, 30)
    })
  }

  const addDownloadedTrack = async (track: Track) => {
    // Save to JSON metadata in Electron
    if ((window as any).electron?.app?.saveTrackMetadata) {
      await (window as any).electron.app.saveTrackMetadata(track)
      console.log('💾 [LIBRARY] Saved track metadata to JSON:', track.title)
    }
    
    setDownloadedTracks(prev => {
      if (prev.some(t => t.id === track.id)) {
        // Update existing track
        return prev.map(t => t.id === track.id ? track : t)
      }
      return [...prev, track]
    })
  }

  const removeDownloadedTrack = async (trackId: string) => {
    const track = downloadedTracks.find(t => t.id === trackId)
    
    // Delete physical files (audio + artwork)
    if (track?.localURL && (window as any).electron) {
      try {
        const fs = require('fs')
        if (fs.existsSync(track.localURL)) {
          fs.unlinkSync(track.localURL)
          console.log('🗑️ [LIBRARY] Deleted audio file:', track.localURL)
        }
        
        // Delete artwork file
        if (track.artworkURL && fs.existsSync(track.artworkURL)) {
          fs.unlinkSync(track.artworkURL)
          console.log('🗑️ [LIBRARY] Deleted artwork file:', track.artworkURL)
        }
      } catch (error) {
        console.error('Error deleting files:', error)
      }
    }
    
    // Remove from JSON metadata in Electron
    if ((window as any).electron?.app?.deleteTrackMetadata) {
      await (window as any).electron.app.deleteTrackMetadata(trackId)
      console.log('🗑️ [LIBRARY] Deleted track metadata from JSON:', trackId)
    }
    
    // Remove from downloaded tracks
    setDownloadedTracks(prev => prev.filter(t => t.id !== trackId))
    
    // Also remove from liked songs if present
    setLikedSongs(prev => prev.filter(t => t.id !== trackId))
    
    // Remove from all playlists
    setPlaylists(prev => prev.map(p => ({
      ...p,
      tracks: p.tracks.filter(t => t.id !== trackId)
    })))
  }

  const value: LibraryContextType = {
    likedSongs,
    playlists,
    recentlyPlayed,
    downloadedTracks,
    toggleLike,
    isLiked,
    createPlaylist,
    deletePlaylist,
    updatePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    addToRecentlyPlayed,
    addDownloadedTrack,
    removeDownloadedTrack
  }

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}
