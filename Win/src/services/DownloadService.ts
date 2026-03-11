import { Track } from '../types'
import { soundCloudService } from './SoundCloudService'
import { tidalDownloadService } from './TidalDownloadService'

interface DownloadProgress {
  trackId: string
  progress: number
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  filePath?: string
  error?: string
}

class DownloadService {
  private downloads: Map<string, DownloadProgress> = new Map()
  private progressCallbacks: Map<string, (progress: number) => void> = new Map()

  constructor() {
    // Listen for download progress from Electron
    if (window.electron && window.electron.download) {
      window.electron.download.onDownloadProgress((data: { trackId: string; progress: number }) => {
        this.updateProgress(data.trackId, data.progress)
      })
    }
  }

  async downloadTrack(track: Track, onProgress?: (progress: number) => void): Promise<string> {
    if (onProgress) {
      this.progressCallbacks.set(track.id, onProgress)
    }

    // Check if already downloaded
    const existing = this.downloads.get(track.id)
    if (existing?.status === 'completed' && existing.filePath) {
      console.log('✅ [DOWNLOAD] Track already downloaded:', existing.filePath)
      return existing.filePath
    }

    // Initialize download
    this.downloads.set(track.id, {
      trackId: track.id,
      progress: 0,
      status: 'downloading'
    })

    console.log('📥 [DOWNLOAD SERVICE] Starting download for:', track.title, 'Source:', track.source)

    try {
      let filePath: string

      if (track.source === 'soundcloud' && track.localURL) {
        // Download from SoundCloud using yt-dlp with track ID for unique filename
        console.log('📥 [DOWNLOAD] Using SoundCloud/yt-dlp for:', track.title, 'ID:', track.id)
        filePath = await soundCloudService.download(track.localURL, track.id, (progress) => {
          this.updateProgress(track.id, progress)
        })
      } else if (track.source === 'spotify' || track.id.startsWith('spotify_') || track.id.startsWith('itunes_')) {
        // Download from Spotify/iTunes via Tidal
        console.log('📥 [DOWNLOAD] Using Tidal download for:', track.title)
        filePath = await tidalDownloadService.downloadTrackToCache(track, (progress) => {
          this.updateProgress(track.id, progress)
        })
      } else {
        throw new Error(`Unsupported track source for download: ${track.source}`)
      }

      console.log('✅ [DOWNLOAD SERVICE] Download completed:', filePath)

      // Update download status
      this.downloads.set(track.id, {
        trackId: track.id,
        progress: 100,
        status: 'completed',
        filePath
      })

      return filePath
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      console.error('❌ [DOWNLOAD SERVICE] Download failed:', errorMessage)
      
      this.downloads.set(track.id, {
        trackId: track.id,
        progress: 0,
        status: 'failed',
        error: errorMessage
      })

      throw error
    } finally {
      this.progressCallbacks.delete(track.id)
    }
  }

  private updateProgress(trackId: string, progress: number): void {
    const download = this.downloads.get(trackId)
    if (download) {
      download.progress = progress
      this.downloads.set(trackId, download)
    }

    const callback = this.progressCallbacks.get(trackId)
    if (callback) {
      callback(progress)
    }
  }

  getProgress(trackId: string): DownloadProgress | null {
    return this.downloads.get(trackId) || null
  }

  isDownloaded(trackId: string): boolean {
    const download = this.downloads.get(trackId)
    return download?.status === 'completed' && !!download.filePath
  }

  getFilePath(trackId: string): string | null {
    const download = this.downloads.get(trackId)
    return download?.status === 'completed' ? download.filePath || null : null
  }

  async cancelDownload(trackId: string): Promise<void> {
    const download = this.downloads.get(trackId)
    if (download?.status === 'downloading') {
      try {
        await window.electron.download.cancelDownload(trackId)
        download.status = 'failed'
        download.error = 'Cancelled by user'
        this.downloads.set(trackId, download)
      } catch (error) {
        console.error('Failed to cancel download:', error)
      }
    }
  }

  clearCompleted(): void {
    for (const [trackId, download] of this.downloads.entries()) {
      if (download.status === 'completed' || download.status === 'failed') {
        this.downloads.delete(trackId)
      }
    }
  }
}

export const downloadService = new DownloadService()
