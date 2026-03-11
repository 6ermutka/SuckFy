import { Track } from './index'

declare global {
  interface Window {
    electron: {
      soundcloud: {
        search: (query: string) => Promise<any[]>
        getInfo: (url: string) => Promise<any>
        download: (url: string, trackId: string, onProgress?: (progress: number) => void) => Promise<string>
      }
      download: {
        startDownload: (track: Track) => Promise<void>
        getProgress: (trackId: string) => Promise<number>
        cancelDownload: (trackId: string) => Promise<void>
        onDownloadProgress: (callback: (data: { trackId: string; progress: number }) => void) => void
        downloadFromURL: (
          url: string,
          trackId: string,
          title: string,
          artist: string,
          onProgress?: (progress: number) => void
        ) => Promise<string>
      }
      app: {
        getCacheDir: () => Promise<string>
        getLibraryMetadata: () => Promise<any>
        clearAllCache: () => Promise<{ success: boolean; message?: string }>
      }
      shell: {
        openPath: (path: string) => Promise<void>
      }
    }
  }
}

export {}
