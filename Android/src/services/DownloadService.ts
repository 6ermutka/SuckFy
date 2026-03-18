// Download Service - скачивание треков
import RNFS from 'react-native-fs';
import {Track} from './SpotifyService';
import {storageService} from './StorageService';
import {tidalDownloadService} from './TidalDownloadService';
import {soundCloudDownloadService} from './SoundCloudDownloadService';

export interface DownloadProgress {
  trackId: string;
  progress: number; // 0-100
  bytesWritten: number;
  contentLength: number;
}

class DownloadService {
  private activeDownloads: Map<string, RNFS.DownloadBeginCallbackResult> = new Map();

  async downloadTrack(
    track: Track,
    onProgress?: (progressPercent: number) => void,
  ): Promise<string> {
    try {
      // Определяем расширение файла по источнику
      const extension = track.source === 'soundcloud' ? '.mp3' : '.m4a';
      const fileName = `${this.sanitizeFileName(track.title)}_${track.id}${extension}`;
      const downloadPath = `${storageService.getMusicFolderPath()}/${fileName}`;

      // Проверяем, не скачан ли уже трек
      const exists = await RNFS.exists(downloadPath);
      if (exists) {
        console.log('✅ [DOWNLOAD] Track already downloaded:', downloadPath);
        return downloadPath;
      }

      console.log('📥 [DOWNLOAD] Starting download:', track.title, 'Source:', track.source);

      let filePath: string;

      if (track.source === 'soundcloud') {
        // Используем SoundCloud + FFmpeg
        filePath = await soundCloudDownloadService.downloadTrack(track, onProgress);
      } else {
        // Используем Tidal для iTunes/Spotify треков
        filePath = await tidalDownloadService.downloadTrack(track, onProgress);
      }

      console.log('✅ [DOWNLOAD] Download completed:', filePath);
      return filePath;
    } catch (error) {
      console.error('❌ [DOWNLOAD] Download error:', error);
      this.activeDownloads.delete(track.id);
      throw error;
    }
  }

  cancelDownload(trackId: string): void {
    const download = this.activeDownloads.get(trackId);
    if (download) {
      download.promise.cancel();
      this.activeDownloads.delete(trackId);
      console.log('Download cancelled:', trackId);
    }
  }

  isDownloading(trackId: string): boolean {
    return this.activeDownloads.has(trackId);
  }

  async isTrackDownloaded(track: Track): Promise<boolean> {
    const fileName = `${this.sanitizeFileName(track.title)}_${track.id}.mp3`;
    const filePath = `${storageService.getMusicFolderPath()}/${fileName}`;
    return await RNFS.exists(filePath);
  }

  async getDownloadedTrackPath(track: Track): Promise<string | null> {
    // Пробуем разные расширения
    const baseName = `${this.sanitizeFileName(track.title)}_${track.id}`;
    const extensions = ['.m4a', '.mp3', '.mp4'];
    
    for (const ext of extensions) {
      const filePath = `${storageService.getMusicFolderPath()}/${baseName}${ext}`;
      console.log('🔍 [DOWNLOAD] Checking file:', filePath);
      const exists = await RNFS.exists(filePath);
      if (exists) {
        console.log('✅ [DOWNLOAD] Found file:', filePath);
        return filePath;
      }
    }
    
    console.log('❌ [DOWNLOAD] No downloaded file found for:', track.title);
    return null;
  }

  private sanitizeFileName(name: string): string {
    // Транслитерация кириллицы в латиницу (та же логика что в SoundCloudDownloadService)
    const transliterate = (str: string): string => {
      const ru: {[key: string]: string} = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
        'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
        'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
        'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
        'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
      };
      return str.split('').map(char => ru[char] || char).join('');
    };
    
    return transliterate(name)
      .replace(/[<>:"/\\|?*#]/g, '')  // Убираем спецсимволы, включая #
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')  // Заменяем множественные _ на один
      .replace(/^_|_$/g, '')   // Убираем _ в начале и конце
      .substring(0, 100); // Ограничиваем длину
  }

  async deleteTrack(track: Track): Promise<void> {
    const filePath = await this.getDownloadedTrackPath(track);
    if (filePath) {
      await RNFS.unlink(filePath);
      console.log('Track deleted:', filePath);
    }
  }
}

export const downloadService = new DownloadService();
