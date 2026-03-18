// SoundCloud OAuth Token Service - управление токеном авторизации
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@soundcloud_oauth_token';

class SoundCloudAuthService {
  private oauthToken: string | null = null;

  /**
   * Загрузить OAuth токен из хранилища
   */
  async loadToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEY);
      this.oauthToken = token;
      console.log('🔐 [SC_AUTH] Token loaded:', token ? '✅ Present' : '❌ Not found');
      return token;
    } catch (error) {
      console.error('❌ [SC_AUTH] Failed to load token:', error);
      return null;
    }
  }

  /**
   * Сохранить OAuth токен
   */
  async saveToken(token: string): Promise<boolean> {
    try {
      if (!token || token.trim().length === 0) {
        console.warn('⚠️ [SC_AUTH] Attempted to save empty token');
        return false;
      }

      await AsyncStorage.setItem(STORAGE_KEY, token.trim());
      this.oauthToken = token.trim();
      console.log('✅ [SC_AUTH] Token saved successfully');
      return true;
    } catch (error) {
      console.error('❌ [SC_AUTH] Failed to save token:', error);
      return false;
    }
  }

  /**
   * Удалить OAuth токен
   */
  async clearToken(): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      this.oauthToken = null;
      console.log('🗑️ [SC_AUTH] Token cleared');
      return true;
    } catch (error) {
      console.error('❌ [SC_AUTH] Failed to clear token:', error);
      return false;
    }
  }

  /**
   * Получить текущий токен (из памяти)
   */
  getToken(): string | null {
    return this.oauthToken;
  }

  /**
   * Проверить наличие токена
   */
  hasToken(): boolean {
    return this.oauthToken !== null && this.oauthToken.length > 0;
  }

  /**
   * Валидация OAuth токена через тестовый запрос к API
   */
  async validateToken(token?: string): Promise<boolean> {
    const tokenToValidate = token || this.oauthToken;
    
    if (!tokenToValidate) {
      console.warn('⚠️ [SC_AUTH] No token to validate');
      return false;
    }

    try {
      console.log('🔍 [SC_AUTH] Validating token...');
      
      // Тестовый запрос к API для проверки токена
      const response = await fetch('https://api-v2.soundcloud.com/me', {
        headers: {
          'Authorization': `OAuth ${tokenToValidate}`,
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const isValid = response.ok;
      console.log(isValid ? '✅ [SC_AUTH] Token is valid' : '❌ [SC_AUTH] Token is invalid');
      
      return isValid;
    } catch (error) {
      console.error('❌ [SC_AUTH] Token validation error:', error);
      return false;
    }
  }
}

export const soundCloudAuthService = new SoundCloudAuthService();
