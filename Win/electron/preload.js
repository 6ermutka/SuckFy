const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  
  // SoundCloud API
  soundcloud: {
    search: (query) => ipcRenderer.invoke('soundcloud:search', query),
    getInfo: (url) => ipcRenderer.invoke('soundcloud:getInfo', url),
    download: (url, trackId) => ipcRenderer.invoke('soundcloud:download', url, trackId),
    onDownloadProgress: (callback) => {
      ipcRenderer.on('download:progress', (event, data) => callback(data))
    }
  },
  
  // Download service
  download: {
    startDownload: (track) => ipcRenderer.invoke('download:start', track),
    getProgress: (trackId) => ipcRenderer.invoke('download:getProgress', trackId),
    cancelDownload: (trackId) => ipcRenderer.invoke('download:cancel', trackId),
    downloadFromURL: (url, trackId, title, artist) => ipcRenderer.invoke('download:fromURL', url, trackId, title, artist),
    onDownloadProgress: (callback) => {
      ipcRenderer.on('download:progress', (event, data) => callback(data))
    }
  },
  
  // App utilities
  app: {
    getCacheDir: () => ipcRenderer.invoke('app:getCacheDir'),
    getFileURL: (filePath) => ipcRenderer.invoke('app:getFileURL', filePath),
    scanCachedTracks: () => ipcRenderer.invoke('app:scanCachedTracks'),
    saveTrackMetadata: (track) => ipcRenderer.invoke('app:saveTrackMetadata', track),
    getLibraryMetadata: () => ipcRenderer.invoke('app:getLibraryMetadata'),
    updateLibraryMetadata: (updates) => ipcRenderer.invoke('app:updateLibraryMetadata', updates),
    deleteTrackMetadata: (trackId) => ipcRenderer.invoke('app:deleteTrackMetadata', trackId),
    clearAllCache: () => ipcRenderer.invoke('app:clearAllCache')
  },
  
  // Shell utilities
  shell: {
    openPath: (path) => ipcRenderer.invoke('shell:openPath', path)
  },
  
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  }
})
