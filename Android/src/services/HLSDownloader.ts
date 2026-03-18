// HLS Downloader - скачивание .ts сегментов и объединение в MP3
import RNFS from 'react-native-fs';
import {HLSSegment, HLSPlaylist, hlsParser} from './HLSParser';
import {storageService} from './StorageService';

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  currentSegment: number;
}

class HLSDownloader {
  /**
   * Скачивает один .ts сегмент
   */
  private async downloadSegment(
    segment: HLSSegment,
    outputPath: string,
  ): Promise<void> {
    try {
      const result = await RNFS.downloadFile({
        fromUrl: segment.url,
        toFile: outputPath,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': '*/*',
        },
      }).promise;

      if (result.statusCode !== 200) {
        throw new Error(`Failed to download segment ${segment.index}: ${result.statusCode}`);
      }
    } catch (error) {
      console.error(`❌ [HLS] Failed to download segment ${segment.index}:`, error);
      throw error;
    }
  }

  /**
   * Скачивает все сегменты с прогрессом
   */
  async downloadAllSegments(
    playlist: HLSPlaylist,
    tempDir: string,
    onProgress?: (progress: DownloadProgress) => void,
  ): Promise<string[]> {
    const segmentPaths: string[] = [];
    const total = playlist.segments.length;

    console.log(`📥 [HLS] Starting download of ${total} segments...`);

    // Создаем временную директорию
    await RNFS.mkdir(tempDir);

    for (let i = 0; i < playlist.segments.length; i++) {
      const segment = playlist.segments[i];
      const segmentPath = `${tempDir}/segment_${segment.index}.ts`;

      // Скачиваем сегмент
      await this.downloadSegment(segment, segmentPath);
      segmentPaths.push(segmentPath);

      // Обновляем прогресс
      if (onProgress) {
        const progress: DownloadProgress = {
          downloaded: i + 1,
          total,
          percentage: Math.round(((i + 1) / total) * 100),
          currentSegment: i + 1,
        };
        onProgress(progress);
      }

      console.log(`✅ [HLS] Downloaded segment ${i + 1}/${total}`);
    }

    console.log(`✅ [HLS] All segments downloaded to: ${tempDir}`);
    return segmentPaths;
  }

  /**
   * Объединяет .ts сегменты в один файл
   * В HLS сегменты - это просто части одного потока, можно склеить напрямую
   */
  async concatenateSegments(
    segmentPaths: string[],
    outputPath: string,
    onProgress?: (percent: number) => void,
  ): Promise<void> {
    console.log(`🔗 [HLS] Concatenating ${segmentPaths.length} segments...`);
    console.log(`📁 [HLS] Output: ${outputPath}`);

    try {
      // Создаем пустой выходной файл
      await RNFS.writeFile(outputPath, '', 'base64');

      // Читаем и добавляем каждый сегмент
      for (let i = 0; i < segmentPaths.length; i++) {
        const segmentPath = segmentPaths[i];
        
        // Читаем сегмент как base64
        const segmentData = await RNFS.readFile(segmentPath, 'base64');
        
        // Добавляем к выходному файлу
        await RNFS.appendFile(outputPath, segmentData, 'base64');

        // Обновляем прогресс склейки
        if (onProgress) {
          const percent = Math.round(((i + 1) / segmentPaths.length) * 100);
          onProgress(percent);
        }

        if ((i + 1) % 10 === 0 || i === segmentPaths.length - 1) {
          console.log(`🔗 [HLS] Concatenated ${i + 1}/${segmentPaths.length} segments`);
        }
      }

      console.log('✅ [HLS] Concatenation complete!');
    } catch (error) {
      console.error('❌ [HLS] Concatenation failed:', error);
      throw error;
    }
  }

  /**
   * Очистка временных файлов
   */
  async cleanupTempFiles(tempDir: string): Promise<void> {
    try {
      const exists = await RNFS.exists(tempDir);
      if (exists) {
        await RNFS.unlink(tempDir);
        console.log('🗑️ [HLS] Cleaned up temp directory:', tempDir);
      }
    } catch (error) {
      console.warn('⚠️ [HLS] Failed to cleanup temp files:', error);
    }
  }

  /**
   * Полный процесс скачивания HLS потока
   */
  async downloadHLSStream(
    m3u8Url: string,
    outputPath: string,
    onProgress?: (progress: DownloadProgress) => void,
    onProcessing?: (processingPercent: number) => void,
  ): Promise<string> {
    const tempDir = `${storageService.getMusicFolderPath()}/temp_${Date.now()}`;

    try {
      // 1. Парсим .m3u8 файл
      console.log('🎵 [HLS] Parsing M3U8 playlist...');
      const playlist = await hlsParser.parseFromUrl(m3u8Url);

      // 2. Скачиваем все сегменты
      console.log('📥 [HLS] Downloading segments...');
      const segmentPaths = await this.downloadAllSegments(
        playlist,
        tempDir,
        onProgress,
      );

      // 3. Объединяем сегменты
      console.log('🔗 [HLS] Concatenating segments...');
      await this.concatenateSegments(segmentPaths, outputPath, onProcessing);

      // 4. Проверяем, что файл создан
      const fileExists = await RNFS.exists(outputPath);
      console.log('🔍 [HLS] File exists check:', fileExists, 'at path:', outputPath);

      // 5. Очищаем временные файлы
      await this.cleanupTempFiles(tempDir);

      console.log('✅ [HLS] Download complete:', outputPath);
      return outputPath;
    } catch (error) {
      // Очищаем временные файлы в случае ошибки
      await this.cleanupTempFiles(tempDir);
      throw error;
    }
  }

  /**
   * Получить размер файла
   */
  async getFileSize(filePath: string): Promise<number> {
    try {
      const stat = await RNFS.stat(filePath);
      return stat.size;
    } catch (error) {
      return 0;
    }
  }
}

export const hlsDownloader = new HLSDownloader();
