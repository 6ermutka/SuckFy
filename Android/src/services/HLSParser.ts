// HLS Parser - парсинг .m3u8 файлов для извлечения сегментов
// Реализация для прямого скачивания без FFmpeg

export interface HLSSegment {
  url: string;
  duration: number;
  index: number;
}

export interface HLSPlaylist {
  segments: HLSSegment[];
  totalDuration: number;
  baseUrl: string;
}

class HLSParser {
  /**
   * Парсит .m3u8 файл и извлекает список сегментов
   * @param m3u8Content - содержимое .m3u8 файла
   * @param baseUrl - базовый URL для относительных путей
   */
  parseM3U8(m3u8Content: string, baseUrl: string): HLSPlaylist {
    const lines = m3u8Content.split('\n').map(line => line.trim());
    const segments: HLSSegment[] = [];
    let currentDuration = 0;
    let totalDuration = 0;
    let segmentIndex = 0;

    console.log('🎵 [HLS] Parsing M3U8 playlist...');
    console.log('🔗 [HLS] Base URL:', baseUrl);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Пропускаем пустые строки и комментарии (кроме директив)
      if (!line || (line.startsWith('#') && !line.startsWith('#EXTINF'))) {
        continue;
      }

      // Извлекаем длительность сегмента из #EXTINF
      if (line.startsWith('#EXTINF:')) {
        // Формат: #EXTINF:10.0, или #EXTINF:10.0,no desc
        const match = line.match(/#EXTINF:([\d.]+)/);
        if (match) {
          currentDuration = parseFloat(match[1]);
        }
      } 
      // URL сегмента (не начинается с #)
      else if (!line.startsWith('#')) {
        const segmentUrl = this.resolveUrl(line, baseUrl);
        
        segments.push({
          url: segmentUrl,
          duration: currentDuration,
          index: segmentIndex,
        });

        totalDuration += currentDuration;
        segmentIndex++;
        currentDuration = 0;
      }
    }

    console.log(`✅ [HLS] Parsed ${segments.length} segments, total duration: ${totalDuration.toFixed(1)}s`);

    return {
      segments,
      totalDuration,
      baseUrl,
    };
  }

  /**
   * Разрешает относительный URL в абсолютный
   */
  private resolveUrl(segmentUrl: string, baseUrl: string): string {
    // Если URL уже абсолютный
    if (segmentUrl.startsWith('http://') || segmentUrl.startsWith('https://')) {
      return segmentUrl;
    }

    // Если URL относительный
    // Извлекаем базовый путь из baseUrl
    const baseUrlParts = baseUrl.split('/');
    baseUrlParts.pop(); // Удаляем последнюю часть (имя файла)
    const basePath = baseUrlParts.join('/');

    return `${basePath}/${segmentUrl}`;
  }

  /**
   * Загружает содержимое .m3u8 файла
   */
  async fetchM3U8(m3u8Url: string): Promise<string> {
    console.log('📥 [HLS] Fetching M3U8:', m3u8Url);

    const response = await fetch(m3u8Url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch M3U8: ${response.status}`);
    }

    const content = await response.text();
    console.log('✅ [HLS] M3U8 content fetched, size:', content.length, 'bytes');

    return content;
  }

  /**
   * Полный процесс: загрузка и парсинг .m3u8
   */
  async parseFromUrl(m3u8Url: string): Promise<HLSPlaylist> {
    const content = await this.fetchM3U8(m3u8Url);
    return this.parseM3U8(content, m3u8Url);
  }
}

export const hlsParser = new HLSParser();
