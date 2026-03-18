// SoundCloud Service - поиск и скачивание с SoundCloud API v2
import {Track} from './SpotifyService';
import {soundCloudAuthService} from './SoundCloudAuthService';

// Публичные client_id которые могут работать (меняются периодически)
// Эти ID извлекаются из официального веб-клиента SoundCloud
const CLIENT_IDS = [
  'iZIs9mchVcX5lhVRyQGGAYlNPVldzAoX', // Известный публичный ID
  'a3e059563d7fd3372b49b37f00a00bcf',
  'FweeGBOOEVWaeUO2WDRmNz5kEVNGXGvN',
  '2t9loNQH90kzJcsFCODdigxfp325aq4z', // Дополнительный fallback
  'UW0jVbLZaqNwzaXFVYrDdbFJYjKdwLYy', // Еще один публичный ID
];

interface SoundCloudTrack {
  id: number;
  title: string;
  user: {
    username: string;
  };
  duration: number;
  artwork_url?: string;
  permalink_url: string;
  media: {
    transcodings: Array<{
      url: string;
      format: {
        protocol: string;
        mime_type: string;
      };
      quality: string;
    }>;
  };
}

class SoundCloudService {
  private currentClientId: string = CLIENT_IDS[0];

  /**
   * Получить трек по URL или ID
   */
  async resolveTrack(urlOrId: string): Promise<Track> {
    try {
      let trackId: string;
      
      // Проверяем, является ли это URL SoundCloud
      if (urlOrId.includes('soundcloud.com')) {
        // Извлекаем ID из URL через resolve API
        const oauthToken = soundCloudAuthService.getToken();
        let resolveUrl: string;
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };

        if (oauthToken) {
          resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(urlOrId)}`;
          headers['Authorization'] = `OAuth ${oauthToken}`;
          console.log('🔗 [SOUNDCLOUD] Resolving URL with OAuth:', urlOrId);
        } else {
          resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(urlOrId)}&client_id=${this.currentClientId}`;
          console.log('🔗 [SOUNDCLOUD] Resolving URL with client_id:', urlOrId);
        }
        
        const response = await fetch(resolveUrl, {headers});
        if (!response.ok) {
          throw new Error(`Failed to resolve SoundCloud URL: ${response.status}`);
        }
        
        const data: SoundCloudTrack = await response.json();
        return this.convertToTrack(data);
      } else {
        // Это уже ID
        trackId = urlOrId.replace('soundcloud_', '');
        
        const oauthToken = soundCloudAuthService.getToken();
        let trackUrl: string;
        const headers: Record<string, string> = {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };

        if (oauthToken) {
          trackUrl = `https://api-v2.soundcloud.com/tracks/${trackId}`;
          headers['Authorization'] = `OAuth ${oauthToken}`;
        } else {
          trackUrl = `https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${this.currentClientId}`;
        }
        
        const response = await fetch(trackUrl, {headers});
        if (!response.ok) {
          throw new Error(`Failed to get track: ${response.status}`);
        }
        
        const data: SoundCloudTrack = await response.json();
        return this.convertToTrack(data);
      }
    } catch (error) {
      console.error('❌ [SOUNDCLOUD] Failed to resolve track:', error);
      throw error;
    }
  }

  async search(query: string, limit: number = 20): Promise<Track[]> {
    try {
      // Используем OAuth token если доступен, иначе client_id
      const oauthToken = soundCloudAuthService.getToken();
      let url: string;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };

      if (oauthToken) {
        // Используем OAuth токен для авторизованных запросов
        url = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&limit=${limit}`;
        headers['Authorization'] = `OAuth ${oauthToken}`;
        console.log('🔍 [SOUNDCLOUD] Searching with OAuth token:', query);
      } else {
        // Fallback на client_id для неавторизованных запросов
        url = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${this.currentClientId}&limit=${limit}`;
        console.log('🔍 [SOUNDCLOUD] Searching with client_id:', query);
      }
      
      const response = await fetch(url, {headers});

      if (!response.ok) {
        console.warn('⚠️ [SOUNDCLOUD] Search failed with status:', response.status);
        
        // Пробуем другой client_id
        if (response.status === 401 || response.status === 403) {
          return await this.searchWithNextClientId(query, limit);
        }
        
        throw new Error(`SoundCloud returned ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.collection || data.collection.length === 0) {
        console.log('ℹ️ [SOUNDCLOUD] No results found');
        return [];
      }

      const tracks = data.collection.map((item: SoundCloudTrack) => this.convertToTrack(item));
      console.log(`✅ [SOUNDCLOUD] Found ${tracks.length} tracks`);
      
      return tracks;
    } catch (error) {
      console.error('❌ [SOUNDCLOUD] Search error:', error);
      return [];
    }
  }

  private async searchWithNextClientId(query: string, limit: number): Promise<Track[]> {
    const currentIndex = CLIENT_IDS.indexOf(this.currentClientId);
    const nextIndex = (currentIndex + 1) % CLIENT_IDS.length;
    
    this.currentClientId = CLIENT_IDS[nextIndex];
    console.log('🔄 [SOUNDCLOUD] Trying next client_id...');
    
    return await this.search(query, limit);
  }

  async getStreamUrl(track: Track): Promise<string> {
    try {
      // Получаем информацию о треке
      const trackId = track.id.replace('soundcloud_', '');
      const oauthToken = soundCloudAuthService.getToken();
      
      let trackUrl: string;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };

      if (oauthToken) {
        trackUrl = `https://api-v2.soundcloud.com/tracks/${trackId}`;
        headers['Authorization'] = `OAuth ${oauthToken}`;
        console.log('🔗 [SOUNDCLOUD] Fetching track info with OAuth for ID:', trackId);
      } else {
        trackUrl = `https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${this.currentClientId}`;
        console.log('🔗 [SOUNDCLOUD] Fetching track info with client_id for ID:', trackId);
      }
      
      const response = await fetch(trackUrl, {headers});

      if (!response.ok) {
        throw new Error(`Failed to get track info: ${response.status}`);
      }

      const trackData: SoundCloudTrack = await response.json();
      
      // Ищем HLS транскодинг (audio/mpeg)
      const hlsTranscoding = trackData.media.transcodings.find(
        t => t.format.protocol === 'hls' && t.format.mime_type === 'audio/mpeg'
      );

      if (!hlsTranscoding) {
        throw new Error('No HLS transcoding found');
      }

      // Получаем реальный URL потока (.m3u8)
      let streamInfoUrl: string;
      const streamHeaders: Record<string, string> = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };

      if (oauthToken) {
        streamInfoUrl = hlsTranscoding.url;
        streamHeaders['Authorization'] = `OAuth ${oauthToken}`;
        console.log('🎵 [SOUNDCLOUD] Requesting stream info with OAuth...');
      } else {
        const separator = hlsTranscoding.url.includes('?') ? '&' : '?';
        streamInfoUrl = `${hlsTranscoding.url}${separator}client_id=${this.currentClientId}`;
        console.log('🎵 [SOUNDCLOUD] Requesting stream info with client_id...');
      }
      
      const streamResponse = await fetch(streamInfoUrl, {headers: streamHeaders});
      
      if (!streamResponse.ok) {
        const errorText = await streamResponse.text();
        console.error('❌ [SOUNDCLOUD] Stream URL error:', streamResponse.status, errorText);
        throw new Error(`Failed to get stream URL: ${streamResponse.status}`);
      }

      const streamData = await streamResponse.json();
      
      if (!streamData.url) {
        console.error('❌ [SOUNDCLOUD] No URL in stream data:', streamData);
        throw new Error('No stream URL in response');
      }
      
      console.log('✅ [SOUNDCLOUD] Got HLS stream URL (.m3u8)');
      return streamData.url; // Это .m3u8 ссылка для FFmpeg
    } catch (error) {
      console.error('❌ [SOUNDCLOUD] Failed to get stream URL:', error);
      throw error;
    }
  }

  private convertToTrack(scTrack: SoundCloudTrack): Track {
    // Улучшаем качество обложки
    let artworkURL = scTrack.artwork_url;
    if (artworkURL) {
      artworkURL = artworkURL
        .replace('-large', '-t500x500')
        .replace('-t200x200', '-t500x500')
        .replace('-small', '-t500x500');
    }

    return {
      id: `soundcloud_${scTrack.id}`,
      title: scTrack.title,
      artist: scTrack.user.username,
      album: 'SoundCloud',
      duration: Math.floor(scTrack.duration / 1000), // Конвертируем из ms в секунды
      source: 'soundcloud',
      artworkURL: artworkURL || undefined,
      previewUrl: scTrack.permalink_url, // Храним ссылку на страницу трека
    };
  }
}

export const soundCloudService = new SoundCloudService();
