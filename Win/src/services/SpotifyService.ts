import axios from 'axios'
import { Track, TrackSource } from '../types'

// iTunes Search API response
interface iTunesTrack {
  trackId: number
  trackName: string
  artistName: string
  collectionName: string
  artworkUrl100?: string
  trackTimeMillis?: number
  previewUrl?: string
}

interface iTunesSearchResponse {
  resultCount: number
  results: iTunesTrack[]
}

// song.link API response
interface SongLinkResponse {
  entitiesByUniqueId: {
    [key: string]: {
      apiProvider?: string
      title?: string
      artistName?: string
      thumbnailUrl?: string
      duration?: number
    }
  }
  linksByPlatform: {
    tidal?: {
      entityUniqueId?: string
    }
  }
}

class SpotifyService {
  private userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36'

  // Search using iTunes API (no auth required!)
  async search(query: string, limit: number = 25): Promise<Track[]> {
    try {
      console.log('🔍 [SPOTIFY] Searching iTunes API for:', query)
      
      const encodedQuery = encodeURIComponent(query)
      const url = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&entity=song&limit=${limit}`
      
      const response = await axios.get<iTunesSearchResponse>(url, {
        headers: {
          'User-Agent': this.userAgent
        }
      })

      console.log('✅ [SPOTIFY] Found', response.data.resultCount, 'tracks')
      
      return response.data.results.map(track => this.convertFromiTunes(track))
    } catch (error) {
      console.error('❌ [SPOTIFY] iTunes search failed:', error)
      throw new Error('Failed to search iTunes')
    }
  }

  // Get track from Spotify URL using song.link
  async getTrackFromUrl(url: string): Promise<Track> {
    try {
      // Extract Spotify track ID
      const match = url.match(/track\/([a-zA-Z0-9]+)/)
      if (!match) {
        throw new Error('Invalid Spotify track URL')
      }

      const spotifyId = match[1]
      console.log('🔍 [SPOTIFY] Getting metadata for:', spotifyId)

      // Use song.link to get metadata
      const metadata = await this.getTrackMetadata(spotifyId)
      return metadata
    } catch (error) {
      console.error('❌ [SPOTIFY] Failed to get track from URL:', error)
      throw error
    }
  }

  // Get track metadata from song.link API
  async getTrackMetadata(spotifyId: string): Promise<Track> {
    try {
      const spotifyURL = `https://open.spotify.com/track/${spotifyId}`
      const encodedURL = encodeURIComponent(spotifyURL)
      const songLinkURL = `https://api.song.link/v1-alpha.1/links?url=${encodedURL}`

      const response = await axios.get<SongLinkResponse>(songLinkURL, {
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 20000
      })

      // Get metadata from entitiesByUniqueId
      const entityValues = Object.values(response.data.entitiesByUniqueId)
      const entity = entityValues.find(e => e.apiProvider === 'spotify')
        || entityValues.find(e => e.apiProvider === 'deezer')
        || entityValues.find(e => e.apiProvider === 'appleMusic')
        || entityValues[0]

      const title = entity?.title || 'Unknown Track'
      const artist = entity?.artistName || 'Unknown Artist'
      
      // Get high-res artwork
      const rawArtwork = entity?.thumbnailUrl || ''
      const artworkURL = rawArtwork
        .replace('100x100', '600x600')
        .replace('320x320', '600x600')
        .replace('500x500', '600x600')

      const duration = entity?.duration ? entity.duration / 1000 : 0

      return {
        id: `spotify_${spotifyId}`,
        title,
        artist,
        album: '',
        duration,
        source: TrackSource.SPOTIFY,
        artworkURL: artworkURL || undefined,
        isDownloaded: false
      }
    } catch (error) {
      console.error('❌ [SPOTIFY] Failed to get metadata from song.link:', error)
      throw new Error('Failed to get track metadata')
    }
  }

  private convertFromiTunes(track: iTunesTrack): Track {
    // Get high-res artwork URL
    let artworkURL: string | undefined = undefined
    if (track.artworkUrl100) {
      artworkURL = track.artworkUrl100
        .replace('100x100bb', '600x600bb')
        .replace('100x100', '600x600')
    }

    return {
      id: `itunes_${track.trackId}`,
      title: track.trackName,
      artist: track.artistName,
      album: track.collectionName,
      duration: track.trackTimeMillis ? Math.floor(track.trackTimeMillis / 1000) : 0,
      source: TrackSource.SPOTIFY, // We say it's from "Spotify" search but actually iTunes
      artworkURL,
      isDownloaded: false
    }
  }

  hasCredentials(): boolean {
    return true // No credentials needed for iTunes API!
  }
}

export const spotifyService = new SpotifyService()
