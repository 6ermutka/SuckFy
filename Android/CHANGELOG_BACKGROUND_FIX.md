# Changelog - Исправление фонового воспроизведения

## 16 марта 2026

### ✨ Новые файлы

#### Android (Kotlin)
- `android/app/src/main/java/com/suckfy/AudioPlayerModule.kt` - нативный модуль для воспроизведения
- `android/app/src/main/java/com/suckfy/AudioPlayerPackage.kt` - регистрация модуля

#### JavaScript (TypeScript)
- `src/services/AudioPlayerService.ts` - JS обёртка для нативного модуля

#### Документация
- `BACKGROUND_PLAYBACK_FIX.md` - подробное описание исправления

### 🔧 Изменённые файлы

#### Android
- `android/app/src/main/java/com/suckfy/MainApplication.kt` - добавлен AudioPlayerPackage
- `android/app/src/main/AndroidManifest.xml` - добавлены разрешения WAKE_LOCK и FOREGROUND_SERVICE

#### JavaScript
- `src/contexts/PlayerContext.tsx` - интеграция с AudioPlayerService для Android

### 🐛 Исправленная проблема

**До:** При сворачивании приложения или блокировке экрана треки не переключались автоматически

**После:** Треки автоматически переключаются в фоновом режиме благодаря нативным событиям MediaPlayer

### 🎯 Ключевые улучшения

1. **Надёжное фоновое воспроизведение** - MediaPlayer работает даже когда экран заблокирован
2. **Wake Lock** - предотвращает засыпание процессора во время воспроизведения
3. **Нативные события** - `onTrackCompleted` срабатывает в любом состоянии приложения
4. **Совместимость** - iOS продолжает работать на react-native-sound без изменений

### 📦 Сборка

- APK: `android/app/build/outputs/apk/debug/app-debug.apk` (149MB)
- Версия: Debug
- Архитектуры: arm64-v8a, armeabi-v7a, x86, x86_64

