/**
 * Convert local file path to file:// URL for display in img tags
 * Works with Electron to properly handle local files
 */
export async function getDisplayURL(filePath: string | undefined): Promise<string | undefined> {
  if (!filePath) return undefined
  
  // If already a URL (http/https/data/blob), return as is
  if (filePath.startsWith('http') || filePath.startsWith('data:') || filePath.startsWith('blob:')) {
    return filePath
  }
  
  // If it's a local path and we're in Electron, convert to file:// URL
  if ((window as any).electron?.app?.getFileURL) {
    try {
      const fileURL = await (window as any).electron.app.getFileURL(filePath)
      return fileURL
    } catch (error) {
      console.error('Failed to get file URL:', error)
      return undefined
    }
  }
  
  // Fallback - return as is (for web mode)
  return filePath
}

/**
 * Synchronous version - returns local path for file:// protocol or original URL
 */
export function getDisplayURLSync(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined
  
  // If already a URL (http/https/data/blob), return as is
  if (filePath.startsWith('http') || filePath.startsWith('data:') || filePath.startsWith('blob:') || filePath.startsWith('file://')) {
    return filePath
  }
  
  // If it's a local path, convert to file:// URL
  if (filePath.startsWith('/') || filePath.match(/^[A-Z]:\\/)) {
    return `file://${filePath.replace(/\\/g, '/')}`
  }
  
  // Fallback
  return filePath
}
