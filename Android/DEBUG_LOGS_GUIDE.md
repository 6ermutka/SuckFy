# Руководство по отладке блокировки UI

## Добавлены детальные логи

### LibraryScreen
- ▶️ Play All / 🔀 Shuffle clicked
- Количество треков
- Время выполнения каждой операции

### PlayerContext.playTrackInternal
- ⏰ Время на каждый этап:
  - Проверка filePath
  - **RNFS.exists() - ЗДЕСЬ может быть блокировка!**
  - setState операции
  - audioPlayerService.loadTrack()
  - audioPlayerService.play()
  - mediaNotificationService
  - addToRecentlyPlayed()

## Как отладить

1. Запустите приложение
2. Откройте логи: `adb logcat | grep -E "LIBRARY SCREEN|PLAYER INTERNAL"`
3. Нажмите Play или Shuffle в Library
4. Смотрите где задержка:

### Пример нормальных логов:
```
▶️ [LIBRARY SCREEN] Play All clicked
▶️ [LIBRARY SCREEN] Filtered tracks: 29
▶️ [LIBRARY SCREEN] Calling playTracks...
⏰ [PLAYER INTERNAL] START playTrackInternal
⏰ [PLAYER INTERNAL] Has filePath, elapsed: 1 ms
⏰ [PLAYER INTERNAL] Checking file exists...
⏰ [PLAYER INTERNAL] File check took: 5 ms exists: true  <-- Должно быть быстро!
⏰ [PLAYER INTERNAL] Loading track in AudioPlayerService...
⏰ [PLAYER INTERNAL] Track loaded in: 200 ms
⏰ [PLAYER INTERNAL] TOTAL TIME: 250 ms
```

### Пример ПЛОХИХ логов (блокировка):
```
▶️ [LIBRARY SCREEN] Play All clicked
⏰ [PLAYER INTERNAL] Checking file exists...
⏰ [PLAYER INTERNAL] File check took: 5000 ms  <-- БЛОКИРОВКА!
```

## Что проверить

Если `File check took` больше 1000ms - это БЛОКИРОВКА в RNFS.exists()!

**Решение**: Отключить проверку RNFS.exists() в playTrackInternal
