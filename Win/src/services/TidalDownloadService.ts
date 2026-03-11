import axios from 'axios'
import { Track } from '../types'

// Tidal download service using song.link → Tidal → spotisaver
class TidalDownloadService {
  private tidalAPIs = [
    'https://hifi-one.spotisaver.net',
    'https://hifi-two.spotisaver.net',
    'https://triton.squid.wtf'
  ]
  private userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36'

  // Get Tidal ID from Spotify/iTunes ID using song.link
  async getTidalID(trackId: string, isITunes: boolean = false): Promise<string> {
    try {
      let trackURL: string
      
      if (isITunes) {
        // iTunes format
        trackURL = `https://music.apple.com/us/song/${trackId}`
      } else {
        // Spotify format
        trackURL = `https://open.spotify.com/track/${trackId}`
      }
      
      const encodedURL = encodeURIComponent(trackURL)
      const songLinkURL = `https://api.song.link/v1-alpha.1/links?url=${encodedURL}`

      console.log('🔗 [TIDAL] Getting Tidal ID from song.link for:', trackId, 'Type:', isITunes ? 'iTunes' : 'Spotify')
      console.log('🔗 [TIDAL] Track URL:', trackURL)

      const response = await axios.get(songLinkURL, {
        headers: { 'User-Agent': this.userAgent },
        timeout: 20000
      })

      console.log('🔗 [TIDAL] song.link response status:', response.status)
      
      // Extract Tidal ID from linksByPlatform
      const tidalLink = response.data.linksByPlatform?.tidal
      if (!tidalLink) {
        const platforms = Object.keys(response.data.linksByPlatform || {}).join(', ')
        console.log('🔗 [TIDAL] Available platforms:', platforms)
        throw new Error('Tidal link not found for this track. Available platforms: ' + platforms)
      }

      // Get Tidal URL and extract ID
      const tidalURL = tidalLink.url
      if (!tidalURL) {
        throw new Error('Tidal URL not found in response')
      }
      
      console.log('🔗 [TIDAL] Tidal URL:', tidalURL)
      
      // Extract ID from URL like "https://tidal.com/browse/track/123456"
      const parts = tidalURL.split('/')
      const tidalId = parts[parts.length - 1]
      
      if (!tidalId || isNaN(Number(tidalId))) {
        throw new Error('Could not extract Tidal ID from URL: ' + tidalURL)
      }

      console.log('✅ [TIDAL] Found Tidal ID:', tidalId)
      return tidalId
    } catch (error) {
      console.error('❌ [TIDAL] Failed to get Tidal ID:', error)
      throw error
    }
  }

  // Get direct audio URL from Tidal ID
  async getTidalAudioURL(tidalId: string): Promise<string> {
    let lastError: Error | null = null

    // Try all Tidal API mirrors
    for (const apiUrl of this.tidalAPIs) {
      try {
        console.log('🎵 [TIDAL] Trying API:', apiUrl)
        
        // Use GET request with query params (like original SuckFy)
        const url = `${apiUrl}/track/?id=${tidalId}&quality=HIGH`
        const response = await axios.get(
          url,
          {
            headers: {
              'User-Agent': this.userAgent
            },
            timeout: 15000
          }
        )

        console.log('🎵 [TIDAL] Response from:', apiUrl)

        // Handle v2 response with manifest
        if (response.data && response.data.data && response.data.data.manifest) {
          console.log('🎵 [TIDAL] Got v2 manifest from:', apiUrl)
          const manifest = response.data.data.manifest
          const decoded = this.decodeManifest(manifest)
          return decoded
        }

        // Handle v1 response with direct URL
        if (response.data && response.data.url) {
          console.log('✅ [TIDAL] Got v1 audio URL from:', apiUrl)
          return response.data.url
        }
        
        // Handle direct string URL
        if (typeof response.data === 'string' && response.data.startsWith('http')) {
          console.log('✅ [TIDAL] Got direct URL from:', apiUrl)
          return response.data
        }

        console.warn('⚠️ [TIDAL] Unknown response format from:', apiUrl)
      } catch (error) {
        console.warn('⚠️ [TIDAL] API failed:', apiUrl, error)
        lastError = error as Error
        continue
      }
    }

    throw new Error(`Failed to get Tidal audio URL from all mirrors: ${lastError?.message}`)
  }

  // Decode base64 manifest and extract URL
  private decodeManifest(manifest: string): string {
    try {
      // Decode base64
      const decoded = atob(manifest)
      const json = JSON.parse(decoded)
      
      console.log('🔓 [TIDAL] Decoded manifest:', json.mimeType, json.codecs)
      
      if (json.urls && json.urls.length > 0) {
        const audioUrl = json.urls[0]
        console.log('✅ [TIDAL] Extracted URL from manifest')
        return audioUrl
      }
      
      throw new Error('No URLs found in manifest')
    } catch (error) {
      console.error('❌ [TIDAL] Failed to decode manifest:', error)
      throw new Error('Failed to decode Tidal manifest')
    }
  }

  // Send progress update
  private sendProgress(trackId: string, progress: number) {
    // Send custom event for UI to listen
    window.dispatchEvent(new CustomEvent('download-progress', {
      detail: { trackId, progress }
    }))
    
    console.log(`📊 [TIDAL] Progress for ${trackId}: ${progress}%`)
  }

  // Download track to cache using Electron IPC
  async downloadTrackToCache(
    track: Track,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      // Determine track type and extract ID
      const isITunes = track.id.startsWith('itunes_')
      const trackId = track.id.replace('spotify_', '').replace('itunes_', '')
      
      console.log('📥 [DOWNLOAD] Starting download for:', track.title, 'Type:', isITunes ? 'iTunes' : 'Spotify')

      // Step 1: Connecting to song.link (0%)
      this.sendProgress(track.id, 0)
      if (onProgress) onProgress(0)
      
      // Step 2: Get Tidal ID (0-10%)
      this.sendProgress(track.id, 2)
      if (onProgress) onProgress(2)
      const tidalId = await this.getTidalID(trackId, isITunes)
      
      // Step 3: Finding Tidal link (10%)
      this.sendProgress(track.id, 10)
      if (onProgress) onProgress(10)
      
      // Step 4: Get audio URL (10-15%)
      const audioUrl = await this.getTidalAudioURL(tidalId)
      
      // Step 5: Starting download (15%)
      this.sendProgress(track.id, 15)
      if (onProgress) onProgress(15)
      
      // Step 6: Download via Electron (15-100%)
      const filePath = await window.electron.download.downloadFromURL(
        audioUrl,
        track.id,
        track.title,
        track.artist
      )

      console.log('✅ [DOWNLOAD] Downloaded to:', filePath)
      
      // Step 7: Complete (100%)
      this.sendProgress(track.id, 100)
      if (onProgress) onProgress(100)
      
      return filePath
    } catch (error) {
      console.error('❌ [DOWNLOAD] Failed:', error)
      // Send error state
      this.sendProgress(track.id, -1)
      throw error
    }
  }
}

export const tidalDownloadService = new TidalDownloadService()
