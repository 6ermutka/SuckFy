// SoundCloud Client ID Service - динамическое получение client_id
// Этот сервис может извлекать актуальный client_id из веб-версии SoundCloud
// Пока что используем статический список, но можно добавить динамическое извлечение

class SoundCloudClientIdService {
  private cachedClientId: string | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 часа

  // Статический список известных client_id
  private readonly KNOWN_CLIENT_IDS = [
    'iZIs9mchVcX5lhVRyQGGAYlNPVldzAoX',
    'a3e059563d7fd3372b49b37f00a00bcf',
    'FweeGBOOEVWaeUO2WDRmNz5kEVNGXGvN',
    '2t9loNQH90kzJcsFCODdigxfp325aq4z',
    'UW0jVbLZaqNwzaXFVYrDdbFJYjKdwLYy',
  ];

  /**
   * Получить валидный client_id
   * В будущем можно добавить динамическое извлечение из soundcloud.com
   */
  async getClientId(): Promise<string> {
    // Если есть кешированный ID и он не устарел
    if (this.cachedClientId && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.cachedClientId;
    }

    // Пробуем извлечь динамически (TODO: реализовать парсинг soundcloud.com)
    // const dynamicId = await this.extractFromWebsite();
    // if (dynamicId) {
    //   this.cachedClientId = dynamicId;
    //   this.cacheTimestamp = Date.now();
    //   return dynamicId;
    // }

    // Используем первый из известных ID
    this.cachedClientId = this.KNOWN_CLIENT_IDS[0];
    this.cacheTimestamp = Date.now();
    return this.cachedClientId;
  }

  /**
   * Получить следующий client_id из списка (для fallback)
   */
  getNextClientId(currentId: string): string {
    const currentIndex = this.KNOWN_CLIENT_IDS.indexOf(currentId);
    const nextIndex = (currentIndex + 1) % this.KNOWN_CLIENT_IDS.length;
    return this.KNOWN_CLIENT_IDS[nextIndex];
  }

  /**
   * Валидация client_id через тестовый запрос
   */
  async validateClientId(clientId: string): Promise<boolean> {
    try {
      const testUrl = `https://api-v2.soundcloud.com/search/tracks?q=test&limit=1&client_id=${clientId}`;
      const response = await fetch(testUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('[CLIENT_ID] Validation error:', error);
      return false;
    }
  }

  /**
   * TODO: Динамическое извлечение client_id из soundcloud.com
   * Метод из статьи Habr - парсинг JavaScript файлов SoundCloud
   */
  // private async extractFromWebsite(): Promise<string | null> {
  //   try {
  //     // 1. Загружаем главную страницу SoundCloud
  //     const mainPage = await fetch('https://soundcloud.com');
  //     const html = await mainPage.text();
  //     
  //     // 2. Ищем ссылки на JavaScript bundle
  //     const scriptMatches = html.matchAll(/<script[^>]+src="([^"]+)"/g);
  //     
  //     // 3. Загружаем и парсим каждый скрипт в поисках client_id
  //     for (const match of scriptMatches) {
  //       const scriptUrl = match[1];
  //       const script = await fetch(scriptUrl);
  //       const scriptText = await script.text();
  //       
  //       // 4. Ищем паттерн client_id в коде
  //       const clientIdMatch = scriptText.match(/client_id[=:]"?([a-zA-Z0-9]{32})"?/);
  //       if (clientIdMatch) {
  //         return clientIdMatch[1];
  //       }
  //     }
  //   } catch (error) {
  //     console.error('[CLIENT_ID] Extraction error:', error);
  //   }
  //   return null;
  // }
}

export const soundCloudClientIdService = new SoundCloudClientIdService();
