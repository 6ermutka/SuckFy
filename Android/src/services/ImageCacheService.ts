// Image Cache Service - кэширование обложек треков
import RNFS from 'react-native-fs';
import {storageService} from './StorageService';

class ImageCacheService {
  private cacheFolder: string;

  constructor() {
    this.cacheFolder = `${RNFS.DocumentDirectoryPath}/SuckFy/ImageCache`;
  }

  async initialize(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.cacheFolder);
      if (!exists) {
        await RNFS.mkdir(this.cacheFolder);
        console.log('🖼️ [IMAGE] Cache folder created:', this.cacheFolder);
      }
    } catch (error) {
      console.error('❌ [IMAGE] Failed to initialize cache:', error);
    }
  }

  private getCacheFileName(url: string): string {
    // Создаём уникальное имя файла из URL
    const hash = url.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return `img_${Math.abs(hash)}.jpg`;
  }

  async getCachedImage(url: string): Promise<string> {
    try {
      const fileName = this.getCacheFileName(url);
      const filePath = `${this.cacheFolder}/${fileName}`;

      // Проверяем, есть ли уже в кэше
      const exists = await RNFS.exists(filePath);
      if (exists) {
        console.log('✅ [IMAGE] Using cached image:', fileName);
        return `file://${filePath}`;
      }

      // Скачиваем и кэшируем с таймаутом
      console.log('📥 [IMAGE] Downloading image:', fileName);
      
      // Создаём promise с таймаутом для предотвращения зависания
      const downloadPromise = RNFS.downloadFile({
        fromUrl: url,
        toFile: filePath,
        connectionTimeout: 5000, // 5 секунд таймаут соединения
        readTimeout: 10000, // 10 секунд таймаут чтения
      }).promise;

      // Таймаут на весь процесс скачивания
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Download timeout')), 15000);
      });

      await Promise.race([downloadPromise, timeoutPromise]);

      console.log('✅ [IMAGE] Image cached:', fileName);
      return `file://${filePath}`;
    } catch (error) {
      console.error('❌ [IMAGE] Failed to cache image:', error);
      // Возвращаем пустую строку вместо URL - это предотвратит попытки загрузки
      return '';
    }
  }

  async clearCache(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.cacheFolder);
      if (exists) {
        await RNFS.unlink(this.cacheFolder);
        await RNFS.mkdir(this.cacheFolder);
        console.log('🗑️ [IMAGE] Cache cleared');
      }
    } catch (error) {
      console.error('❌ [IMAGE] Failed to clear cache:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const files = await RNFS.readDir(this.cacheFolder);
      let totalSize = 0;
      for (const file of files) {
        totalSize += file.size;
      }
      return totalSize;
    } catch (error) {
      console.error('❌ [IMAGE] Failed to get cache size:', error);
      return 0;
    }
  }
}

export const imageCacheService = new ImageCacheService();
