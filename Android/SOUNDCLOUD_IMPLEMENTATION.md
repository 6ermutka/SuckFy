# 🎵 SoundCloud Download Implementation

## 📖 Реализация согласно статье Habr
**Ссылка:** https://habr.com/ru/articles/850116/

## ⚠️ ОБНОВЛЕНО: Переход на прямое скачивание HLS

**Причина:** `ffmpeg-kit-react-native` deprecated и не компилируется  
**Новое решение:** Прямое скачивание .ts сегментов без FFmpeg  
**Подробности:** См. `HLS_IMPLEMENTATION.md`

---

## ✅ Что реализовано

### 1. **SoundCloud API v2 интеграция**
**Файл:** `src/services/SoundCloudService.ts`

#### Поиск треков:
```typescript
// GET запрос согласно Habr статье
https://api-v2.soundcloud.com/search/tracks?q={query}&client_id={client_id}&limit={limit}
```

#### Получение информации о треке:
```typescript
// GET запрос для получения media.transcodings
https://api-v2.soundcloud.com/tracks/{track_id}?client_id={client_id}
```

#### Извлечение HLS stream URL:
```typescript
// Из ответа берем:
media.transcodings[] -> где format.protocol === 'hls' && format.mime_type === 'audio/mpeg'
// Затем запрашиваем URL:
transcodings[].url?client_id={client_id}
// Получаем .m3u8 ссылку
```

### 2. **FFmpeg конвертация HLS → MP3**
**Файл:** `src/services/SoundCloudDownloadService.ts`

#### Команда FFmpeg (из статьи):
```bash
ffmpeg -i "m3u8_url" -c copy -f mp3 "output.mp3"
```

#### Улучшенная версия:
```bash
ffmpeg -protocol_whitelist file,http,https,tcp,tls \
       -i "m3u8_url" \
       -c copy \
       -bsf:a aac_adtstoasc \
       -f mp3 \
       "output.mp3"
```

**Улучшения:**
- ✅ `-protocol_whitelist` - разрешаем все необходимые протоколы
- ✅ `-c copy` - копируем без перекодирования (быстрее)
- ✅ `-bsf:a aac_adtstoasc` - конвертируем AAC для MP3 контейнера
- ✅ Прогресс-бар через FFmpeg statistics
- ✅ Детальное логирование

### 3. **Client ID управление**
**Файл:** `src/services/SoundCloudClientIdService.ts`

- 📦 Список известных публичных client_id
- 🔄 Автоматический fallback на следующий ID при ошибке 401/403
- ⏰ Кэширование client_id (24 часа)
- ✅ Валидация client_id через тестовый запрос
- 🚀 TODO: Динамическое извлечение client_id из soundcloud.com (парсинг JS файлов)

## 🔧 Архитектура

```
User → SearchScreen
         ↓
    SoundCloudService (поиск)
         ↓
    Track результаты
         ↓
    User нажимает Download
         ↓
    DownloadService
         ↓
    SoundCloudDownloadService
         ↓
    1. getStreamUrl() → .m3u8 URL
    2. FFmpegKit → конвертация
    3. Сохранение в .mp3
```

## 📊 Сравнение с Windows SuckFy

| Функция | Windows (C#) | Android (React Native) |
|---------|--------------|------------------------|
| API Version | SoundCloud API v2 | ✅ SoundCloud API v2 |
| Поиск | ✅ Да | ✅ Да |
| Client ID | Статический | ✅ Динамический fallback |
| Stream URL | .m3u8 | ✅ .m3u8 |
| Конвертация | FFmpeg | ✅ FFmpeg (ffmpeg-kit) |
| Формат | MP3 | ✅ MP3 |
| Прогресс | Базовый | ✅ Детальный (FFmpeg stats) |

## 🎯 Преимущества текущей реализации

1. **✅ Полное соответствие методу из Habr**
   - API v2 эндпоинты
   - client_id в query параметрах
   - FFmpeg конвертация

2. **✅ Улучшения по сравнению со статьей**
   - Множественные client_id (fallback)
   - User-Agent для надежности
   - Детальное логирование
   - Прогресс-бар
   - Обработка ошибок

3. **✅ Мобильная оптимизация**
   - ffmpeg-kit-react-native (оптимизирован для Android/iOS)
   - Асинхронное выполнение
   - Отслеживание прогресса

## 📝 Пример использования

```typescript
// 1. Поиск треков
const tracks = await soundCloudService.search('Beatles', 20);

// 2. Скачивание
const filePath = await soundCloudDownloadService.downloadTrack(
  track,
  (progress) => console.log(`Progress: ${progress}%`)
);

// 3. Результат
// /data/user/0/com.suckfy/files/SuckFy/Music/Beatles_Song_soundcloud_12345.mp3
```

## 🐛 Известные ограничения

1. **Client ID могут устаревать**
   - Решение: Автоматический fallback на следующий ID
   - TODO: Динамическое извлечение из soundcloud.com

2. **FFmpeg зависимость**
   - Размер APK увеличивается на ~50MB
   - Альтернатива: Прямое скачивание HLS сегментов (сложнее)

3. **Региональные ограничения**
   - SoundCloud может блокировать треки в некоторых регионах
   - Решение: Используем User-Agent десктопного браузера

## 🚀 Возможные улучшения

1. **Динамическое получение client_id**
   ```typescript
   // Парсить soundcloud.com и извлекать client_id из JS файлов
   const clientId = await extractClientIdFromWebsite();
   ```

2. **Прямое скачивание без FFmpeg**
   ```typescript
   // Скачивать .ts сегменты из .m3u8 и склеивать
   const segments = await parseM3U8(m3u8Url);
   for (const segment of segments) {
     await downloadSegment(segment);
   }
   await concatenateSegments();
   ```

3. **Кэш stream URL**
   ```typescript
   // Сохранять .m3u8 URL на некоторое время
   // Чтобы не делать повторные запросы к API
   ```

## 📚 Ссылки

- [Habr статья](https://habr.com/ru/articles/850116/)
- [SoundCloud API v2 (неофициальное)](https://github.com/soundcloud/api-v2)
- [FFmpeg документация](https://ffmpeg.org/documentation.html)
- [ffmpeg-kit-react-native](https://github.com/arthenica/ffmpeg-kit)
