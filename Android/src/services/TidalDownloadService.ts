// Tidal download service using song.link → Tidal → spotisaver
import RNFS from 'react-native-fs';
import {Track} from './SpotifyService';
import {storageService} from './StorageService';

interface SongLinkResponse {
  linksByPlatform?: {
    tidal?: {
      url: string;
    };
  };
}

interface TidalManifest {
  mimeType: string;
  codecs: string;
  urls: string[];
}

class TidalDownloadService {
  private tidalAPIs = [
    'https://hifi-one.spotisaver.net',
    'https://hifi-two.spotisaver.net',
    'https://triton.squid.wtf',
  ];
  
  private userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36';

  // Get Tidal ID from Spotify/iTunes ID using song.link
  async getTidalID(trackId: string, source: 'spotify' | 'itunes'): Promise<string> {
    try {
      let trackURL: string;
      
      if (source === 'itunes') {
        // iTunes format - просто song ID
        trackURL = `https://music.apple.com/us/song/${trackId}`;
      } else {
        // Spotify track URL
        trackURL = `https://open.spotify.com/track/${trackId}`;
      }
      
      const encodedURL = encodeURIComponent(trackURL);
      const songLinkURL = `https://api.song.link/v1-alpha.1/links?url=${encodedURL}`;

      console.log('🔗 [TIDAL] Getting Tidal ID from song.link for:', trackId);
      console.log('🔗 [TIDAL] Track URL:', trackURL);

      const response = await fetch(songLinkURL, {
        headers: {'User-Agent': this.userAgent},
      });

      if (!response.ok) {
        throw new Error(`song.link returned ${response.status}`);
      }

      const data: SongLinkResponse = await response.json();
      
      const tidalLink = data.linksByPlatform?.tidal;
      if (!tidalLink) {
        const platforms = Object.keys(data.linksByPlatform || {}).join(', ');
        console.log('🔗 [TIDAL] Available platforms:', platforms);
        throw new Error('Tidal link not found for this track');
      }

      const tidalURL = tidalLink.url;
      if (!tidalURL) {
        throw new Error('Tidal URL not found in response');
      }
      
      console.log('🔗 [TIDAL] Tidal URL:', tidalURL);
      
      // Extract ID from URL like "https://tidal.com/browse/track/123456"
      const parts = tidalURL.split('/');
      const tidalId = parts[parts.length - 1];
      
      if (!tidalId || isNaN(Number(tidalId))) {
        throw new Error('Could not extract Tidal ID from URL: ' + tidalURL);
      }

      console.log('✅ [TIDAL] Found Tidal ID:', tidalId);
      return tidalId;
    } catch (error) {
      console.error('❌ [TIDAL] Failed to get Tidal ID:', error);
      throw error;
    }
  }

  // Get direct audio URL from Tidal ID
  async getTidalAudioURL(tidalId: string): Promise<string> {
    let lastError: Error | null = null;

    // Try all Tidal API mirrors
    for (const apiUrl of this.tidalAPIs) {
      try {
        console.log('🎵 [TIDAL] Trying API:', apiUrl);
        
        const url = `${apiUrl}/track/?id=${tidalId}&quality=HIGH`;
        const response = await fetch(url, {
          headers: {'User-Agent': this.userAgent},
        });

        if (!response.ok) {
          console.warn('⚠️ [TIDAL] API returned:', response.status);
          continue;
        }

        const data = await response.json();
        console.log('🎵 [TIDAL] Response from:', apiUrl);

        // Handle v2 response with manifest
        if (data?.data?.manifest) {
          console.log('🎵 [TIDAL] Got v2 manifest from:', apiUrl);
          const audioUrl = this.decodeManifest(data.data.manifest);
          return audioUrl;
        }

        // Handle v1 response with direct URL
        if (data?.data?.url) {
          console.log('🎵 [TIDAL] Got v1 direct URL from:', apiUrl);
          return data.data.url;
        }

        // Handle direct URL in response
        if (data?.url) {
          console.log('🎵 [TIDAL] Got direct URL from:', apiUrl);
          return data.url;
        }

        console.warn('⚠️ [TIDAL] Unknown response format from:', apiUrl);
      } catch (error) {
        console.warn('⚠️ [TIDAL] API failed:', apiUrl, error);
        lastError = error as Error;
        continue;
      }
    }

    throw new Error(`Failed to get Tidal audio URL from all mirrors: ${lastError?.message}`);
  }

  // Decode base64 manifest and extract URL
  private decodeManifest(manifest: string): string {
    try {
      // Decode base64
      const decoded = atob(manifest);
      const json: TidalManifest = JSON.parse(decoded);
      
      console.log('🔓 [TIDAL] Decoded manifest:', json.mimeType, json.codecs);
      
      if (json.urls && json.urls.length > 0) {
        const audioUrl = json.urls[0];
        console.log('✅ [TIDAL] Extracted URL from manifest');
        return audioUrl;
      }
      
      throw new Error('No URLs found in manifest');
    } catch (error) {
      console.error('❌ [TIDAL] Failed to decode manifest:', error);
      throw new Error('Failed to decode Tidal manifest');
    }
  }

  // Download full track
  async downloadTrack(
    track: Track,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    try {
      // Определяем источник трека:
      // - Spotify ID содержит буквы и цифры (например: 3coRPMnFg2dJcPu5RMloa9)
      // - iTunes ID - только цифры (например: 1772214981)
      const trackId = track.id.replace('spotify_', '').replace('itunes_', '');
      
      // Проверяем, является ли ID только цифрами (iTunes) или содержит буквы (Spotify)
      const isNumericId = /^\d+$/.test(trackId);
      
      // Если ID только из цифр - это iTunes, даже если префикс spotify_
      // Если ID содержит буквы - это настоящий Spotify ID
      const source: 'spotify' | 'itunes' = isNumericId ? 'itunes' : 'spotify';
      
      console.log('📥 [DOWNLOAD] Starting download for:', track.title);
      console.log('📥 [DOWNLOAD] Track ID:', trackId);
      console.log('📥 [DOWNLOAD] Source:', source);
      console.log('📥 [DOWNLOAD] Original track.id:', track.id);

      // Step 1: Get Tidal ID (0-10%)
      if (onProgress) onProgress(5);
      const tidalId = await this.getTidalID(trackId, source);
      
      // Step 2: Get audio URL (10-20%)
      if (onProgress) onProgress(15);
      const audioUrl = await this.getTidalAudioURL(tidalId);
      
      // Step 3: Download file (20-100%)
      if (onProgress) onProgress(20);
      
      const fileName = `${this.sanitizeFileName(track.title)}_${track.id}.m4a`;
      const downloadPath = `${storageService.getMusicFolderPath()}/${fileName}`;

      console.log('📥 [DOWNLOAD] Downloading from:', audioUrl);
      console.log('📥 [DOWNLOAD] Saving to:', downloadPath);

      // Download with progress
      const downloadResult = RNFS.downloadFile({
        fromUrl: audioUrl,
        toFile: downloadPath,
        background: true,
        progressDivider: 10,
        begin: (res) => {
          console.log('📥 [DOWNLOAD] Started, size:', res.contentLength);
        },
        progress: (res) => {
          const progress = 20 + (res.bytesWritten / res.contentLength) * 80;
          if (onProgress) {
            onProgress(Math.round(progress));
          }
        },
      });

      const result = await downloadResult.promise;

      if (result.statusCode === 200) {
        console.log('✅ [DOWNLOAD] Completed:', downloadPath);
        if (onProgress) onProgress(100);
        return downloadPath;
      } else {
        throw new Error(`Download failed with status: ${result.statusCode}`);
      }
    } catch (error) {
      console.error('❌ [DOWNLOAD] Failed:', error);
      throw error;
    }
  }

  private sanitizeFileName(name: string): string {
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
      .replace(/[<>:"/\\|?*#]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100);
    }
}

export const tidalDownloadService = new TidalDownloadService();
