// Track types
export enum TrackSource {
  SPOTIFY = 'spotify',
  SOUNDCLOUD = 'soundcloud',
  ITUNES = 'itunes',
  IMPORTED = 'imported'
}

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  artworkURL?: string
  duration: number
  source: TrackSource
  localURL?: string
  isDownloaded?: boolean
  isDownloading?: boolean
}

// Playlist types
export interface Playlist {
  id: string
  name: string
  description: string
  artworkURL?: string
  customArtwork?: string // Path to custom uploaded artwork
  tracks: Track[]
}

// Player types
export enum RepeatMode {
  OFF = 'off',
  ALL = 'all',
  ONE = 'one'
}

export interface PlayerState {
  currentTrack: Track | null
  queue: Track[]
  isPlaying: boolean
  progress: number
  currentTime: number
  duration: number
  volume: number
  isShuffle: boolean
  repeatMode: RepeatMode
  showQueue: boolean
}

// Library types
export interface LibraryState {
  likedSongs: Track[]
  playlists: Playlist[]
  recentlyPlayed: Track[]
  downloadedTracks: Track[]
}
