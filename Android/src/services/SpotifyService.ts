// Spotify Service - использует iTunes API для поиска (не требует авторизации)
// Аналогично Windows порту SuckFy

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // в секундах
  artworkURL?: string;
  previewUrl?: string;
  source: 'spotify' | 'soundcloud' | 'local';
  filePath?: string; // путь к скачанному файлу
}

class SpotifyService {
  // iTunes API не требует ключей и работает без авторизации
  private readonly ITUNES_API = 'https://itunes.apple.com/search';

  async search(query: string, limit: number = 20): Promise<Track[]> {
    try {
      const url = `${this.ITUNES_API}?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        return [];
      }

      return data.results.map((item: any) => ({
        id: `spotify_${item.trackId}`,
        title: item.trackName || 'Unknown Track',
        artist: item.artistName || 'Unknown Artist',
        album: item.collectionName || 'Unknown Album',
        duration: Math.floor(item.trackTimeMillis / 1000) || 0,
        artworkURL: item.artworkUrl100?.replace('100x100', '500x500') || item.artworkUrl60,
        previewUrl: item.previewUrl,
        source: 'spotify' as const,
      }));
    } catch (error) {
      console.error('Spotify search error:', error);
      return [];
    }
  }

  /**
   * Получить трек по Spotify URL
   * Использует song.link API (как в оригинальном SuckFy)
   */
  async resolveTrack(spotifyUrl: string): Promise<Track> {
    try {
      // Извлекаем track ID из URL
      const trackIdMatch = spotifyUrl.match(/track\/([a-zA-Z0-9]+)/);
      if (!trackIdMatch) {
        throw new Error('Invalid Spotify URL');
      }
      
      const trackId = trackIdMatch[1];
      console.log('🎵 [SPOTIFY] Resolving track ID:', trackId);
      
      // Используем song.link API для получения метаданных
      const encodedUrl = encodeURIComponent(spotifyUrl);
      const songLinkUrl = `https://api.song.link/v1-alpha.1/links?url=${encodedUrl}`;
      
      console.log('🔗 [SPOTIFY] Fetching from song.link...');
      const response = await fetch(songLinkUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
      });
      
      if (!response.ok) {
        throw new Error(`song.link API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📦 [SPOTIFY] song.link data received');
      
      // Получаем метаданные из entitiesByUniqueId
      // Приоритет: spotify → deezer → apple → amazon
      const entityValues = Object.values(data.entitiesByUniqueId || {}) as any[];
      const entity = entityValues.find((e: any) => e.apiProvider === 'spotify')
        || entityValues.find((e: any) => e.apiProvider === 'deezer')
        || entityValues.find((e: any) => e.apiProvider === 'appleMusic')
        || entityValues.find((e: any) => e.apiProvider === 'amazon')
        || entityValues[0];
      
      if (!entity) {
        throw new Error('No metadata found in song.link response');
      }
      
      const title = entity.title || 'Unknown Track';
      const artist = entity.artistName || 'Unknown Artist';
      const duration = entity.duration ? Math.floor(entity.duration / 1000) : 0;
      
      // Улучшаем качество обложки
      let artworkURL = entity.thumbnailUrl || '';
      artworkURL = artworkURL
        .replace('100x100', '600x600')
        .replace('320x320', '600x600')
        .replace('500x500', '600x600');
      
      console.log('✅ [SPOTIFY] Resolved:', title, 'by', artist);
      
      // Возвращаем трек с метаданными из song.link
      // ID начинается с spotify_ для совместимости с TidalDownloadService
      return {
        id: `spotify_${trackId}`,
        title,
        artist,
        album: entity.albumName || 'Unknown Album',
        duration,
        artworkURL: artworkURL || undefined,
        source: 'spotify' as const,
      };
    } catch (error) {
      console.error('❌ [SPOTIFY] Failed to resolve track:', error);
      throw error;
    }
  }
}

export const spotifyService = new SpotifyService();
