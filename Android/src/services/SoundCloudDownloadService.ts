// SoundCloud Download Service - прямое скачивание HLS без FFmpeg
// Новая реализация БЕЗ deprecated зависимостей
// 1. Получение client_id из SoundCloud API
// 2. Запрос треков через API v2
// 3. Получение HLS stream URL (.m3u8)
// 4. Парсинг .m3u8 и скачивание .ts сегментов
// 5. Объединение сегментов в MP3
import RNFS from 'react-native-fs';
import {Track} from './SpotifyService';
import {soundCloudService} from './SoundCloudService';
import {storageService} from './StorageService';
import {hlsDownloader, DownloadProgress} from './HLSDownloader';

class SoundCloudDownloadService {
  async downloadTrack(
    track: Track,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    try {
      console.log('📥 [SOUNDCLOUD] Starting download:', track.title);
      
      // Шаг 1: Получаем .m3u8 URL (0-10%)
      if (onProgress) onProgress(5);
      const m3u8Url = await soundCloudService.getStreamUrl(track);
      console.log('🔗 [SOUNDCLOUD] Got m3u8 URL:', m3u8Url);
      
      if (onProgress) onProgress(10);
      
      // Шаг 2: Скачиваем HLS сегменты и объединяем (10-100%)
      const fileName = `${this.sanitizeFileName(track.title)}_${track.id}.mp3`;
      const outputPath = `${storageService.getMusicFolderPath()}/${fileName}`;
      
      console.log('📥 [SOUNDCLOUD] Track title:', track.title);
      console.log('📥 [SOUNDCLOUD] Track ID:', track.id);
      console.log('📥 [SOUNDCLOUD] Sanitized filename:', fileName);
      console.log('📥 [SOUNDCLOUD] Full output path:', outputPath);
      
      // Скачиваем через HLS downloader с прогрессом
      await hlsDownloader.downloadHLSStream(
        m3u8Url,
        outputPath,
        (hlsProgress: DownloadProgress) => {
          if (onProgress) {
            // Преобразуем прогресс HLS:
            // 10-80% - скачивание сегментов
            // 80-95% - склейка сегментов (processing)
            // 95-100% - завершение
            let totalProgress: number;
            
            if (hlsProgress.percentage < 100) {
              // Скачивание сегментов: 10% -> 80%
              totalProgress = 10 + (hlsProgress.percentage * 0.7);
            } else {
              // Склейка завершена, но еще проверяем файл
              totalProgress = 95;
            }
            
            onProgress(Math.round(totalProgress));
          }
          
          // Логируем прогресс
          if (hlsProgress.currentSegment % 5 === 0 || hlsProgress.currentSegment === hlsProgress.total) {
            console.log(
              `📊 [SOUNDCLOUD] Progress: ${hlsProgress.currentSegment}/${hlsProgress.total} segments (${hlsProgress.percentage}%)`
            );
          }
        },
        (processingProgress: number) => {
          // Callback для прогресса склейки
          if (onProgress) {
            // Processing: 80% -> 95%
            const totalProgress = 80 + (processingProgress * 0.15);
            onProgress(Math.round(totalProgress));
          }
        }
      );
      
      // Проверяем, что файл создан
      const exists = await RNFS.exists(outputPath);
      if (!exists) {
        throw new Error('Downloaded file not found');
      }
      
      // Получаем размер файла
      const fileSize = await hlsDownloader.getFileSize(outputPath);
      console.log(`✅ [SOUNDCLOUD] Download complete! Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
      
      if (onProgress) onProgress(100);
      
      return outputPath;
    } catch (error) {
      console.error('❌ [SOUNDCLOUD] Download error:', error);
      throw error;
    }
  }

  private sanitizeFileName(name: string): string {
    // Транслитерация кириллицы в латиницу
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
      .substring(0, 100);
  }
}

export const soundCloudDownloadService = new SoundCloudDownloadService();
