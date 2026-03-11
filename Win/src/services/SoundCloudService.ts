import { Track, TrackSource } from '../types'

// SoundCloud service with OAuth authentication
class SoundCloudService {
  private authToken: string = ''
  private isAuthenticated: boolean = false
  private username: string = ''

  constructor() {
    this.loadToken()
  }

  // Load OAuth token from localStorage
  private loadToken(): void {
    const token = localStorage.getItem('soundcloud_oauth_token')
    const username = localStorage.getItem('soundcloud_username')
    
    if (token) {
      this.authToken = token
      this.isAuthenticated = true
      this.username = username || ''
      console.log('[SoundCloud] Loaded token for user:', this.username)
    }
  }

  // Save OAuth token
  saveToken(token: string, username: string = ''): void {
    this.authToken = token
    this.isAuthenticated = !!token && token.length > 0
    this.username = username

    localStorage.setItem('soundcloud_oauth_token', token)
    localStorage.setItem('soundcloud_username', username)
    
    console.log('[SoundCloud] Token saved for user:', username)
  }

  // Check if authenticated
  hasAuth(): boolean {
    return this.isAuthenticated && !!this.authToken
  }

  // Get auth token
  getToken(): string {
    return this.authToken
  }

  async search(query: string): Promise<Track[]> {
    try {
      if (!this.hasAuth()) {
        throw new Error('SoundCloud authentication required. Please login in Settings.')
      }

      // Call Electron main process to execute yt-dlp with OAuth
      const results = await window.electron.soundcloud.search(query)
      return results.map(this.convertToTrack)
    } catch (error) {
      console.error('SoundCloud search failed:', error)
      throw new Error('Failed to search SoundCloud')
    }
  }

  async getTrackFromUrl(url: string): Promise<Track> {
    try {
      const info = await window.electron.soundcloud.getInfo(url)
      return this.convertToTrack(info)
    } catch (error) {
      console.error('Failed to get SoundCloud track:', error)
      throw new Error('Failed to get track from SoundCloud')
    }
  }

  async download(url: string, trackId: string, onProgress?: (progress: number) => void): Promise<string> {
    try {
      // Download using yt-dlp in Electron main process with trackId for unique filename
      const filePath = await window.electron.soundcloud.download(url, trackId)
      if (onProgress) {
        onProgress(100) // Report completion
      }
      return filePath
    } catch (error) {
      console.error('Failed to download from SoundCloud:', error)
      throw new Error('Failed to download track')
    }
  }

  private convertToTrack(info: any): Track {
    // Support both single thumbnail string and thumbnails array (from --flat-playlist)
    let artworkURL = info.thumbnail
    if (!artworkURL && Array.isArray(info.thumbnails) && info.thumbnails.length > 0) {
      // Pick the largest thumbnail available
      const sorted = [...info.thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0))
      artworkURL = sorted[0].url
    }
    if (artworkURL) {
      artworkURL = artworkURL
        .replace('-large', '-t500x500')
        .replace('-t200x200', '-t500x500')
        .replace('-small', '-t500x500')
    }

    return {
      id: info.id || `soundcloud_${Date.now()}`,
      title: info.title || 'Unknown Track',
      artist: info.uploader || info.artist || 'Unknown Artist',
      album: info.album || 'SoundCloud',
      duration: info.duration || 0,
      source: TrackSource.SOUNDCLOUD,
      artworkURL,
      localURL: info.webpage_url || info.url, // Use webpage_url for proper SoundCloud URL
      isDownloaded: false
    }
  }
}

export const soundCloudService = new SoundCloudService()
