# SuckFy Android

Музыкальный плеер для Android на React Native с поддержкой SoundCloud и Spotify.

## Возможности

- 🎵 Поиск и скачивание треков из SoundCloud и Spotify
- 📱 Полный оффлайн режим
- 🔔 Медиа уведомления
- ❤️ Избранные треки

## Установка

```bash
npm install
```

## Запуск на устройстве

```bash
npm run android
```

## Сборка Release APK

### Способ 1: Автоматически

```bash
chmod +x build_release.sh
./build_release.sh
```

### Способ 2: Вручную

```bash
cd android
./gradlew assembleRelease
```

APK будет находиться в:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Требования

- Node.js 18+
- Android SDK
- JDK 17

## Документация

- [Инструкции по сборке](ANDROID_BUILD_INSTRUCTIONS.md)
- [Руководство разработчика](ANDROID_DEV_GUIDE.md)
- [Быстрый старт](QUICK_START.md)
- [HLS реализация](HLS_IMPLEMENTATION.md)

## Версия

**v1.1** - Исправлена блокировка UI при недоступности SoundCloud

## Автор

6ermutka
