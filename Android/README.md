# SuckFy Android

Android версия музыкального плеера SuckFy на React Native.

## Возможности

- 🎵 Поиск и скачивание треков из SoundCloud и Spotify (через iTunes API)
- 📱 Полноценный оффлайн режим - все скачанные треки работают без интернета
- 🎨 Современный UI с поддержкой темной темы
- 🔔 Медиа уведомления с управлением воспроизведением
- 📥 Скачивание треков в формате MP3
- ❤️ Избранные треки и плейлисты
- 🎨 Кэширование обложек

## Требования

- Node.js 18+
- npm или yarn
- Android SDK
- JDK 17
- React Native CLI

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск на Android
npm run android
```

## Сборка Release APK

```bash
# Быстрая сборка
./build_release.sh

# Или вручную
cd android
./gradlew assembleRelease
```

APK будет в: `android/app/build/outputs/apk/release/app-release.apk`

## Документация

- [Инструкции по сборке](ANDROID_BUILD_INSTRUCTIONS.md)
- [Руководство разработчика](ANDROID_DEV_GUIDE.md)
- [Быстрый старт](QUICK_START.md)
- [Тестирование](TESTING_INSTRUCTIONS.md)

## Версии

### v1.1 (текущая)
- ✅ Исправлена блокировка UI при недоступности SoundCloud
- ✅ Убрана синхронная загрузка обложек в уведомлениях
- ✅ Улучшена стабильность оффлайн режима

### v1.0
- Первый релиз Android версии

## Автор

6ermutka
