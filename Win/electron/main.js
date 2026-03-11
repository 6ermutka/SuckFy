const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')

// Determine yt-dlp path based on platform and environment
function getYtDlpPath() {
  console.log('[SuckFy] ========== YT-DLP DEBUG ==========')
  console.log('[SuckFy] Platform:', process.platform)
  console.log('[SuckFy] Is packaged:', app.isPackaged)
  console.log('[SuckFy] __dirname:', __dirname)
  
  if (process.platform === 'win32') {
    // In production (packaged app), look in resources folder
    if (app.isPackaged) {
      const resourcesPath = process.resourcesPath
      console.log('[SuckFy] Resources path:', resourcesPath)
      
      const ytdlpPath = path.join(resourcesPath, 'yt-dlp.exe')
      console.log('[SuckFy] Looking for yt-dlp at:', ytdlpPath)
      console.log('[SuckFy] File exists:', fs.existsSync(ytdlpPath))
      
      if (fs.existsSync(ytdlpPath)) {
        console.log('[SuckFy] ✅ Using bundled yt-dlp:', ytdlpPath)
        return ytdlpPath
      }
      
      // Also try in app.asar.unpacked
      const unpackedPath = path.join(__dirname, '..', 'app.asar.unpacked', 'electron', 'yt-dlp.exe')
      console.log('[SuckFy] Trying unpacked path:', unpackedPath)
      console.log('[SuckFy] Unpacked exists:', fs.existsSync(unpackedPath))
      
      if (fs.existsSync(unpackedPath)) {
        console.log('[SuckFy] ✅ Using unpacked yt-dlp:', unpackedPath)
        return unpackedPath
      }
    }
    
    // In development, look in electron folder
    const devPath = path.join(__dirname, 'yt-dlp.exe')
    console.log('[SuckFy] Looking for dev yt-dlp at:', devPath)
    console.log('[SuckFy] Dev file exists:', fs.existsSync(devPath))
    
    if (fs.existsSync(devPath)) {
      console.log('[SuckFy] ✅ Using dev yt-dlp:', devPath)
      return devPath
    }
    
    // Fallback to system yt-dlp if available
    console.log('[SuckFy] ⚠️ Using system yt-dlp (fallback)')
    return 'yt-dlp'
  }
  // For macOS/Linux, assume yt-dlp is in PATH
  console.log('[SuckFy] ✅ Using system yt-dlp (macOS/Linux)')
  return 'yt-dlp'
}

// Determine ffmpeg path based on platform and environment
function getFfmpegPath() {
  console.log('[SuckFy] ========== FFMPEG DEBUG ==========')
  
  if (process.platform === 'win32') {
    // In production (packaged app), look in resources folder
    if (app.isPackaged) {
      const resourcesPath = process.resourcesPath
      const ffmpegPath = path.join(resourcesPath, 'ffmpeg.exe')
      console.log('[SuckFy] Looking for ffmpeg at:', ffmpegPath)
      
      if (fs.existsSync(ffmpegPath)) {
        console.log('[SuckFy] ✅ Using bundled ffmpeg:', ffmpegPath)
        return ffmpegPath
      }
      
      // Also try in app.asar.unpacked
      const unpackedPath = path.join(__dirname, '..', 'app.asar.unpacked', 'electron', 'ffmpeg.exe')
      if (fs.existsSync(unpackedPath)) {
        console.log('[SuckFy] ✅ Using unpacked ffmpeg:', unpackedPath)
        return unpackedPath
      }
    }
    
    // In development, look in electron folder
    const devPath = path.join(__dirname, 'ffmpeg.exe')
    console.log('[SuckFy] Looking for dev ffmpeg at:', devPath)
    
    if (fs.existsSync(devPath)) {
      console.log('[SuckFy] ✅ Using dev ffmpeg:', devPath)
      return devPath
    }
    
    // Fallback to system ffmpeg if available
    console.log('[SuckFy] ⚠️ Using system ffmpeg (fallback)')
    return 'ffmpeg'
  }
  // For macOS/Linux, assume ffmpeg is in PATH
  console.log('[SuckFy] ✅ Using system ffmpeg (macOS/Linux)')
  return 'ffmpeg'
}

const YTDLP_PATH = getYtDlpPath()
const FFMPEG_PATH = getFfmpegPath()
console.log('[SuckFy] Final YTDLP_PATH:', YTDLP_PATH)
console.log('[SuckFy] Final FFMPEG_PATH:', FFMPEG_PATH)
console.log('[SuckFy] ======================================')

// Cache directory for downloaded tracks - use Documents/SuckFy
const CACHE_DIR = path.join(os.homedir(), 'Documents', 'SuckFy', 'Music')
const ALBUM_DIR = path.join(os.homedir(), 'Documents', 'SuckFy', 'Album')
const METADATA_FILE = path.join(os.homedir(), 'Documents', 'SuckFy', 'library.json')

// Ensure cache directories exist
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  console.log('[SuckFy] Created cache directory:', CACHE_DIR)
}
if (!fs.existsSync(ALBUM_DIR)) {
  fs.mkdirSync(ALBUM_DIR, { recursive: true })
  console.log('[SuckFy] Created album directory:', ALBUM_DIR)
}

// Library metadata structure
let libraryMetadata = {
  tracks: {},
  playlists: [],
  likedSongs: [],
  recentlyPlayed: [],
  version: '1.0'
}

// Load library metadata from JSON file
function loadLibraryMetadata() {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf8')
      libraryMetadata = JSON.parse(data)
      console.log('[SuckFy] Loaded library metadata:', Object.keys(libraryMetadata.tracks).length, 'tracks')
    } else {
      console.log('[SuckFy] No existing library metadata found, starting fresh')
    }
  } catch (error) {
    console.error('[SuckFy] Error loading library metadata:', error)
  }
}

// Save library metadata to JSON file
function saveLibraryMetadata() {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(libraryMetadata, null, 2), 'utf8')
    console.log('[SuckFy] Saved library metadata:', Object.keys(libraryMetadata.tracks).length, 'tracks')
  } catch (error) {
    console.error('[SuckFy] Error saving library metadata:', error)
  }
}

// Load metadata on startup
loadLibraryMetadata()

// Cache artwork from URL - save in Album folder
async function cacheArtwork(trackId, artworkURL) {
  return new Promise((resolve) => {
    try {
      const https = require('https')
      const http = require('http')
      
      // Determine file extension from URL
      const ext = artworkURL.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)?.[1] || 'jpg'
      const artworkPath = path.join(ALBUM_DIR, `${trackId}.${ext}`)
      
      // Check if already cached
      if (fs.existsSync(artworkPath)) {
        console.log('[SuckFy] Artwork already cached:', trackId)
        resolve(artworkPath)
        return
      }
      
      const protocol = artworkURL.startsWith('https') ? https : http
      const file = fs.createWriteStream(artworkPath)
      
      console.log('[SuckFy] Caching artwork for:', trackId, 'from:', artworkURL)
      
      const request = protocol.get(artworkURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      }, (response) => {
        if (response.statusCode !== 200) {
          file.close()
          try { fs.unlinkSync(artworkPath) } catch {}
          console.error('[SuckFy] Artwork download failed with status:', response.statusCode)
          resolve(null)
          return
        }
        
        response.pipe(file)
        
        file.on('finish', () => {
          file.close()
          console.log('[SuckFy] Artwork cached successfully:', artworkPath)
          resolve(artworkPath)
        })
      })
      
      request.on('error', (error) => {
        file.close()
        try { fs.unlinkSync(artworkPath) } catch {}
        console.error('[SuckFy] Error caching artwork:', error)
        resolve(null)
      })
      
      request.setTimeout(30000, () => {
        request.destroy()
        file.close()
        try { fs.unlinkSync(artworkPath) } catch {}
        console.error('[SuckFy] Artwork download timeout')
        resolve(null)
      })
    } catch (error) {
      console.error('[SuckFy] Error caching artwork:', error)
      resolve(null)
    }
  })
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    minWidth: 880,
    minHeight: 580,
    frame: false,
    backgroundColor: '#121212',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Allow loading local files
    }
  })

  // Добавляем горячую клавишу F12 для открытия DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  // В режиме разработки загружаем с Vite dev server
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // В production загружаем собранные файлы
    mainWindow.loadFile(path.join(__dirname, '../dist-react/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// IPC Handlers for SoundCloud (yt-dlp)
ipcMain.handle('soundcloud:search', async (event, query) => {
  return new Promise((resolve, reject) => {
    // Use --flat-playlist to get track list without trying to resolve each API URL individually
    const searchUrl = `scsearch10:${query}`
    
    const ytdlp = spawn(YTDLP_PATH, [
      '--dump-json',
      '--flat-playlist',
      '--no-warnings',
      '--quiet',
      searchUrl
    ])

    let output = ''
    let errorOutput = ''

    ytdlp.stdout.on('data', (data) => {
      output += data.toString()
    })

    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    ytdlp.on('close', (code) => {
      if (code !== 0) {
        console.error('yt-dlp error:', errorOutput)
        reject(new Error(`yt-dlp search failed: ${errorOutput}`))
        return
      }

      try {
        if (!output.trim()) {
          resolve([])
          return
        }

        const lines = output.trim().split('\n').filter(line => line.trim())
        const results = lines.map(line => {
          try {
            const entry = JSON.parse(line)
            // --flat-playlist gives us url as the API url and webpage_url may be missing.
            // Build a proper SoundCloud webpage_url from the track url if needed.
            if (entry.url && !entry.webpage_url) {
              // If url looks like an API url, try to build webpage_url from uploader/title
              // or keep the url so download handler can use it
              entry.webpage_url = entry.url
            }
            return entry
          } catch (e) {
            console.error('Failed to parse line:', line)
            return null
          }
        }).filter(r => r !== null)
        
        resolve(results)
      } catch (error) {
        console.error('Parse error:', error, 'Output:', output)
        reject(new Error('Failed to parse search results'))
      }
    })

    ytdlp.on('error', (error) => {
      reject(new Error(`Failed to spawn yt-dlp: ${error.message}`))
    })
  })
})

ipcMain.handle('soundcloud:getInfo', async (event, url) => {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn(YTDLP_PATH, [
      '--dump-json',
      '--no-warnings',
      url
    ])

    let output = ''
    let errorOutput = ''

    ytdlp.stdout.on('data', (data) => {
      output += data.toString()
    })

    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    ytdlp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp getInfo failed: ${errorOutput}`))
        return
      }

      try {
        const info = JSON.parse(output)
        resolve(info)
      } catch (error) {
        reject(new Error('Failed to parse track info'))
      }
    })
  })
})

ipcMain.handle('soundcloud:download', async (event, url, trackId) => {
  return new Promise((resolve, reject) => {
    // Use trackId if provided, otherwise extract from URL
    let filename = trackId || url.split('/').pop() || Date.now().toString()
    // Remove query parameters and decode URL encoding
    filename = decodeURIComponent(filename.split('?')[0])
    // Replace invalid filename characters
    filename = filename.replace(/[:<>"|?*\.]/g, '_')
    
    const outputPath = path.join(CACHE_DIR, `soundcloud_${filename}.mp3`)

    // Check if already downloaded
    if (fs.existsSync(outputPath)) {
      resolve(outputPath)
      return
    }

    const ytdlp = spawn(YTDLP_PATH, [
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--embed-thumbnail',
      '--add-metadata',
      '--ffmpeg-location', FFMPEG_PATH,
      '-o', outputPath,
      '--no-warnings',
      '--progress',
      url
    ])

    let errorOutput = ''

    ytdlp.stdout.on('data', (data) => {
      const output = data.toString()
      // Parse progress and send to renderer
      const match = output.match(/(\d+\.\d+)%/)
      if (match) {
        const progress = parseFloat(match[1])
        // Send progress with trackId so PlayerContext can match it
        event.sender.send('download:progress', { 
          trackId: trackId || filename, 
          progress: Math.min(progress, 100) 
        })
        console.log(`Download progress for ${filename}: ${progress}%`)
      }
    })

    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    ytdlp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Download failed: ${errorOutput}`))
        return
      }

      resolve(outputPath)
    })
  })
})

// Download service handlers
ipcMain.handle('download:start', async (event, track) => {
  try {
    let filePath
    
    if (track.source === 'soundcloud') {
      // Extract original URL from track
      const url = track.localURL || track.id.replace('soundcloud_', 'https://soundcloud.com/')
      filePath = await ipcMain.emit('soundcloud:download', event, url)
    } else if (track.source === 'spotify') {
      // For Spotify, we need to use a different approach (e.g., spotdl)
      // For now, return error
      throw new Error('Spotify downloads not yet implemented')
    }
    
    return filePath
  } catch (error) {
    throw error
  }
})

ipcMain.handle('download:getProgress', async (event, trackId) => {
  // Progress is sent via 'download:progress' event
  return 0
})

ipcMain.handle('download:cancel', async (event, trackId) => {
  // TODO: Implement download cancellation
  return true
})

// Get cache directory path
ipcMain.handle('app:getCacheDir', async () => {
  return CACHE_DIR
})

// Save track metadata
ipcMain.handle('app:saveTrackMetadata', async (event, track) => {
  try {
    libraryMetadata.tracks[track.id] = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      source: track.source,
      localURL: track.localURL,
      artworkURL: track.artworkURL,
      isDownloaded: track.isDownloaded,
      addedDate: track.addedDate || new Date().toISOString()
    }
    
    // Cache artwork if URL provided
    if (track.artworkURL && track.artworkURL.startsWith('http')) {
      const artworkPath = await cacheArtwork(track.id, track.artworkURL)
      if (artworkPath) {
        libraryMetadata.tracks[track.id].artworkURL = artworkPath
      }
    }
    
    saveLibraryMetadata()
    console.log('[SuckFy] Saved track metadata:', track.title, '-', track.artist)
    return true
  } catch (error) {
    console.error('[SuckFy] Error saving track metadata:', error)
    return false
  }
})

// Get all library metadata
ipcMain.handle('app:getLibraryMetadata', async () => {
  return libraryMetadata
})

// Update library metadata (playlists, liked songs, etc)
ipcMain.handle('app:updateLibraryMetadata', async (event, updates) => {
  try {
    if (updates.playlists !== undefined) {
      libraryMetadata.playlists = updates.playlists
    }
    if (updates.likedSongs !== undefined) {
      libraryMetadata.likedSongs = updates.likedSongs
    }
    if (updates.recentlyPlayed !== undefined) {
      libraryMetadata.recentlyPlayed = updates.recentlyPlayed
    }
    saveLibraryMetadata()
    return true
  } catch (error) {
    console.error('[SuckFy] Error updating library metadata:', error)
    return false
  }
})

// Delete track metadata
ipcMain.handle('app:deleteTrackMetadata', async (event, trackId) => {
  try {
    if (libraryMetadata.tracks[trackId]) {
      delete libraryMetadata.tracks[trackId]
      saveLibraryMetadata()
      console.log('[SuckFy] Deleted track metadata:', trackId)
    }
    return true
  } catch (error) {
    console.error('[SuckFy] Error deleting track metadata:', error)
    return false
  }
})

// Clear all cache - delete all files and metadata
ipcMain.handle('app:clearAllCache', async () => {
  try {
    console.log('[SuckFy] Clearing all cache...')
    
    let deletedCount = 0
    
    // Delete all files in Music directory
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR)
      
      for (const file of files) {
        const filePath = path.join(CACHE_DIR, file)
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath)
            deletedCount++
          }
        } catch (err) {
          console.error('[SuckFy] Failed to delete file:', filePath, err)
        }
      }
    }
    
    // Delete all files in Album directory
    if (fs.existsSync(ALBUM_DIR)) {
      const files = fs.readdirSync(ALBUM_DIR)
      
      for (const file of files) {
        const filePath = path.join(ALBUM_DIR, file)
        try {
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath)
            deletedCount++
          }
        } catch (err) {
          console.error('[SuckFy] Failed to delete file:', filePath, err)
        }
      }
    }
    
    console.log('[SuckFy] Deleted', deletedCount, 'files from cache')
    
    // Clear all metadata
    libraryMetadata = {
      tracks: {},
      playlists: [],
      likedSongs: [],
      recentlyPlayed: [],
      version: '1.0'
    }
    saveLibraryMetadata()
    
    console.log('[SuckFy] Cache cleared successfully')
    return { success: true, message: 'All cache cleared successfully' }
  } catch (error) {
    console.error('[SuckFy] Error clearing cache:', error)
    return { success: false, message: error.message }
  }
})

// Get file URL for local playback or artwork display
ipcMain.handle('app:getFileURL', async (event, filePath) => {
  // Return file:// URL for local files
  if (filePath && fs.existsSync(filePath)) {
    // For Windows paths, ensure proper URL format
    const normalizedPath = filePath.replace(/\\/g, '/')
    return `file://${normalizedPath}`
  }
  throw new Error('File not found: ' + filePath)
})

// Open path in system file manager
ipcMain.handle('shell:openPath', async (event, path) => {
  const { shell } = require('electron')
  return shell.openPath(path)
})

// Window controls
ipcMain.handle('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.minimize()
})

ipcMain.handle('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.handle('window:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.close()
})

ipcMain.handle('window:isMaximized', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return win?.isMaximized() || false
})

// Scan cache directory and return all cached tracks with metadata
ipcMain.handle('app:scanCachedTracks', async () => {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      return []
    }

    const files = fs.readdirSync(CACHE_DIR)
    const cachedTracks = []

    for (const file of files) {
      const filePath = path.join(CACHE_DIR, file)
      const stats = fs.statSync(filePath)
      
      // Skip if not a file or too small to be a valid audio file
      if (!stats.isFile() || stats.size < 1000) {
        continue
      }

      // Parse filename to extract track info
      // Format: soundcloud_TRACKID.mp3 or itunes_TRACKID.m4a or spotify_TRACKID.m4a
      let trackId = null
      let source = null
      
      if (file.startsWith('soundcloud_') && file.endsWith('.mp3')) {
        trackId = file.replace('soundcloud_', '').replace('.mp3', '')
        source = 'soundcloud'
      } else if (file.startsWith('itunes_') && file.endsWith('.m4a')) {
        trackId = file.replace('itunes_', '').replace('.m4a', '')
        source = 'itunes'
      } else if (file.startsWith('spotify_') && file.endsWith('.m4a')) {
        trackId = file.replace('spotify_', '').replace('.m4a', '')
        source = 'spotify'
      } else if (file.endsWith('.mp3') || file.endsWith('.m4a')) {
        trackId = file.replace(/\.(mp3|m4a)$/, '')
        source = 'imported'
      } else {
        continue
      }

      // Try to find metadata with both ID formats (with and without prefix)
      let metadata = libraryMetadata.tracks[trackId] || libraryMetadata.tracks[`${source}_${trackId}`]
      
      if (metadata) {
        // Use metadata from library.json and update file path
        cachedTracks.push({
          ...metadata,
          localURL: filePath, // Update with current file path
          isDownloaded: true
        })
      } else {
        // No metadata found - create basic entry with the ID that matches filename
        const displayId = source === 'soundcloud' || source === 'spotify' || source === 'itunes' ? trackId : `${source}_${trackId}`
        cachedTracks.push({
          id: displayId,
          title: `Track ${trackId}`,
          artist: 'Unknown Artist',
          album: source === 'soundcloud' ? 'SoundCloud' : source === 'itunes' ? 'iTunes' : source === 'spotify' ? 'Spotify' : 'Unknown',
          duration: 0,
          source: source,
          localURL: filePath,
          isDownloaded: true,
          filename: file,
          size: stats.size,
          modifiedTime: stats.mtime
        })
      }
    }

    console.log(`[SuckFy] Found ${cachedTracks.length} cached tracks in ${CACHE_DIR}`)
    console.log(`[SuckFy] With metadata: ${cachedTracks.filter(t => libraryMetadata.tracks[t.id]).length}`)
    return cachedTracks
  } catch (error) {
    console.error('[SuckFy] Error scanning cached tracks:', error)
    return []
  }
})

// Download from direct URL (for Tidal downloads)
ipcMain.handle('download:fromURL', async (event, url, trackId, title, artist) => {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const outputPath = path.join(CACHE_DIR, `${trackId}.m4a`)

    // Check if already exists
    if (fs.existsSync(outputPath)) {
      console.log('[SuckFy] Track already cached:', outputPath)
      resolve(outputPath)
      return
    }

    console.log('[SuckFy] Downloading from URL:', url)
    
    const file = fs.createWriteStream(outputPath)
    let downloadedBytes = 0
    let totalBytes = 0

    const request = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36'
      }
    }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`))
        return
      }

      totalBytes = parseInt(response.headers['content-length'] || '0', 10)

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length
        file.write(chunk)
        
        if (totalBytes > 0) {
          const progress = (downloadedBytes / totalBytes) * 100
          event.sender.send('download:progress', { 
            trackId, 
            progress: Math.round(progress),
            downloaded: downloadedBytes,
            total: totalBytes
          })
        }
      })

      response.on('end', () => {
        file.end()
        console.log('[SuckFy] Download complete:', outputPath)
        resolve(outputPath)
      })

      response.on('error', (error) => {
        file.end()
        fs.unlinkSync(outputPath).catch(() => {})
        reject(error)
      })
    })

    request.on('error', (error) => {
      file.end()
      fs.unlinkSync(outputPath).catch(() => {})
      reject(error)
    })

    request.setTimeout(300000, () => {
      request.destroy()
      file.end()
      fs.unlinkSync(outputPath).catch(() => {})
      reject(new Error('Download timeout'))
    })
  })
})
