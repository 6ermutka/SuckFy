import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react'
import { Track, PlayerState, RepeatMode } from '../types'

interface PlayerContextType extends PlayerState {
  // Playback controls
  play: (track?: Track) => void
  pause: () => void
  playPause: () => void
  next: () => void
  previous: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  
  // Queue management
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  setQueue: (tracks: Track[]) => void
  
  // Modes
  toggleShuffle: () => void
  toggleRepeat: () => void
  toggleQueue: () => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider')
  }
  return context
}

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(() => {
    const saved = localStorage.getItem('suckfy-volume')
    return saved !== null ? parseFloat(saved) : 0.7
  })
  const [isShuffle, setIsShuffle] = useState(false)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(RepeatMode.OFF)
  const [showQueue, setShowQueue] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = volume
    }
  }, [])

  // Update progress
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      progressInterval.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime)
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)
        }
      }, 100)
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current)
      }
    }
  }, [isPlaying])

  const play = useCallback(async (track?: Track) => {
    if (track) {
      setCurrentTrack(track)
      
      // Add to recently played via custom event
      window.dispatchEvent(new CustomEvent('track-played', { detail: track }))
      
      if (audioRef.current && track.localURL) {
        try {
          // Get file URL from Electron
          const fileURL = await (window as any).electron.app.getFileURL(track.localURL)
          
          console.log('🎵 [PLAYER] Setting audio source:', fileURL)
          audioRef.current.src = fileURL
          audioRef.current.load()
          
          await audioRef.current.play()
          console.log('✅ [PLAYER] Playback started')
          setIsPlaying(true)
        } catch (err) {
          console.error('❌ [PLAYER] Playback failed:', err)
          setIsPlaying(false)
        }
      }
    } else if (audioRef.current && currentTrack) {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (err) {
        console.error('❌ [PLAYER] Playback failed:', err)
        setIsPlaying(false)
      }
    }
  }, [currentTrack])

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const playPause = useCallback(() => {
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  }, [isPlaying, play, pause])

  const handleTrackEnd = useCallback(() => {
    console.log('🎵 [PLAYER] Track ended. Queue length:', queue.length, 'Repeat mode:', repeatMode, 'Shuffle:', isShuffle)
    
    if (repeatMode === RepeatMode.ONE) {
      // Repeat current track
      console.log('🔁 [PLAYER] Repeating current track')
      if (audioRef.current && currentTrack) {
        audioRef.current.currentTime = 0
        audioRef.current.play()
        setIsPlaying(true)
      }
    } else if (queue.length > 0) {
      // Play next track from queue
      const nextTrack = queue[0]
      console.log('⏭️ [PLAYER] Playing next track from queue:', nextTrack.title)
      setQueue(prev => prev.slice(1))
      play(nextTrack)
    } else if (repeatMode === RepeatMode.ALL) {
      // Queue is empty but repeat all is on - need to restart
      console.log('🔁 [PLAYER] Repeat all: queue empty, need to rebuild queue from last context')
      // Since we don't have access to the full track list here, we dispatch an event
      window.dispatchEvent(new CustomEvent('queue-ended-repeat-all'))
      setIsPlaying(false)
    } else {
      console.log('⏹️ [PLAYER] No more tracks in queue - stopping')
      setIsPlaying(false)
    }
  }, [repeatMode, queue, currentTrack, play, isShuffle])

  const next = useCallback(() => {
    if (queue.length > 0) {
      const nextTrack = queue[0]
      setQueue(prev => prev.slice(1))
      play(nextTrack)
    }
  }, [queue, play])

  const previous = useCallback(() => {
    if (audioRef.current) {
      if (audioRef.current.currentTime > 3) {
        // If more than 3 seconds played, restart current track
        audioRef.current.currentTime = 0
      } else {
        // TODO: Play previous track from history
        audioRef.current.currentTime = 0
      }
    }
  }, [])

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
      setProgress((time / audioRef.current.duration) * 100)
    }
  }, [])

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume)
    localStorage.setItem('suckfy-volume', String(newVolume))
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }, [])

  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => [...prev, track])
  }, [])

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearQueue = useCallback(() => {
    setQueue([])
  }, [])

  const toggleShuffle = useCallback(() => {
    setIsShuffle(prev => !prev)
  }, [])

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      switch (prev) {
        case RepeatMode.OFF:
          return RepeatMode.ALL
        case RepeatMode.ALL:
          return RepeatMode.ONE
        case RepeatMode.ONE:
          return RepeatMode.OFF
        default:
          return RepeatMode.OFF
      }
    })
  }, [])

  const toggleQueue = useCallback(() => {
    setShowQueue(prev => !prev)
  }, [])

  // Setup event listeners (separate effect to handle dependencies)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Event listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      console.log('🎵 [PLAYER] Track ended event fired')
      handleTrackEnd()
    }

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e)
      setIsPlaying(false)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [handleTrackEnd])

  const value: PlayerContextType = {
    currentTrack,
    queue,
    isPlaying,
    progress,
    currentTime,
    duration,
    volume,
    isShuffle,
    repeatMode,
    showQueue,
    play,
    pause,
    playPause,
    next,
    previous,
    seek,
    setVolume,
    addToQueue,
    removeFromQueue,
    clearQueue,
    setQueue,
    toggleShuffle,
    toggleRepeat,
    toggleQueue
  }

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}
