# SuckFy Android

Музыкальный плеер для Android с поддержкой SoundCloud и Spotify.

## Возможности

- 🎵 Поиск и скачивание треков из SoundCloud и Spotify
- 📱 Оффлайн режим
- 🔔 Медиа уведомления
- ❤️ Избранные треки

## Установка зависимостей

```bash
npm install
```

## Запуск

```bash
npm run android
```

## Сборка APK

### Автоматически
```bash
./build_release.sh
```

### Вручную
```bash
cd android
./gradlew assembleRelease
```

**Готовый APK:**
```
android/app/build/outputs/apk/release/app-release.apk
```

## Требования

- Node.js 18+
- Android SDK
- JDK 17


