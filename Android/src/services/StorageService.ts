// Storage Service - управление папкой для сохранения треков
import RNFS from 'react-native-fs';

class StorageService {
  private musicFolder: string;
  private imageCacheFolder: string;

  constructor() {
    // Используем папку Music в Documents
    this.musicFolder = `${RNFS.DocumentDirectoryPath}/SuckFy/Music`;
    this.imageCacheFolder = `${RNFS.DocumentDirectoryPath}/SuckFy/ImageCache`;
  }

  async initialize(): Promise<void> {
    try {
      // Создаем папку Music если её нет
      const musicExists = await RNFS.exists(this.musicFolder);
      if (!musicExists) {
        await RNFS.mkdir(this.musicFolder);
        console.log('Music folder created:', this.musicFolder);
      }
      
      // Создаем папку ImageCache если её нет
      const imageCacheExists = await RNFS.exists(this.imageCacheFolder);
      if (!imageCacheExists) {
        await RNFS.mkdir(this.imageCacheFolder);
        console.log('Image cache folder created:', this.imageCacheFolder);
      }
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  getMusicFolderPath(): string {
    return this.musicFolder;
  }

  getImageCachePath(): string {
    return this.imageCacheFolder;
  }

  async setMusicFolder(newPath: string): Promise<boolean> {
    try {
      const exists = await RNFS.exists(newPath);
      if (!exists) {
        await RNFS.mkdir(newPath);
      }
      this.musicFolder = newPath;
      return true;
    } catch (error) {
      console.error('Failed to set music folder:', error);
      return false;
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const files = await RNFS.readDir(this.musicFolder);
      let totalSize = 0;
      for (const file of files) {
        totalSize += file.size;
      }
      return totalSize;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }

  async clearCache(): Promise<boolean> {
    try {
      await RNFS.unlink(this.musicFolder);
      await RNFS.mkdir(this.musicFolder);
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  getTrackFilePath(trackId: string, extension: string = 'mp3'): string {
    return `${this.musicFolder}/${trackId}.${extension}`;
  }
}

export const storageService = new StorageService();
