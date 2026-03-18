# 🚀 Быстрый старт для разработки

## Установка зависимостей

```bash
npm install
# или
yarn install
```

## Установка npm-run-all для параллельных команд

```bash
npm install --save-dev npm-run-all
# или
yarn add -D npm-run-all
```

## Запуск для разработки на macOS

### Рекомендуемый способ (2 терминала)

**Терминал 1 - Metro Bundler с логами:**
```bash
npm run dev
# или просто
npm start
```

**Терминал 2 - iOS Симулятор:**
```bash
npm run ios
```

### Альтернатива (1 команда, экспериментально)

```bash
npm run dev:ios
```

> ⚠️ Требует установки `npm-run-all`

## Dev Menu в iOS симуляторе

1. **Запустите приложение** (npm run ios)
2. **Откройте Dev Menu**: нажмите **Cmd + D** в симуляторе
3. **Включите Hot Reload** для автоматической перезагрузки
4. **Debug JS Remotely** для Chrome DevTools

### Горячие клавиши iOS симулятора:
- **Cmd + D** - Dev Menu
- **Cmd + R** - Reload приложения
- **Cmd + Ctrl + Z** - Element Inspector

## Просмотр логов

### Вариант 1: В терминале Metro Bundler
Все `console.log()` отображаются автоматически

### Вариант 2: iOS Device Logs
В отдельном терминале:
```bash
npm run logs:ios
```

### Вариант 3: Chrome DevTools
1. Dev Menu (Cmd + D)
2. "Debug JS Remotely"
3. Chrome откроется автоматически
4. Cmd + Option + J - Console

## Логи SoundCloud сервиса

Все логи помечены эмодзи:
```
🔍 [SOUNDCLOUD] - Поиск треков
🔗 [SOUNDCLOUD] - Получение информации о треке
🎵 [SOUNDCLOUD] - Stream URL
🔐 [SC_AUTH] - OAuth токен
✅ - Успех
❌ - Ошибка
⚠️ - Предупреждение
```

Фильтр в терминале:
```bash
npm start | grep SOUNDCLOUD
npm start | grep SC_AUTH
```

## Настройка SoundCloud OAuth

1. **Получите OAuth токен** - см. `SOUNDCLOUD_OAUTH_SETUP.md`
2. Откройте **Settings** в приложении
3. Вставьте токен в поле **SoundCloud OAuth**
4. Нажмите **Сохранить токен**
5. Приложение валидирует токен автоматически

> Токен опционален! Приложение работает и без него через публичные client_id

## Очистка кэша

```bash
# Полная очистка и перезапуск
npm run reset

# Или вручную
watchman watch-del-all
rm -rf $TMPDIR/react-*
npm start -- --reset-cache
```

## Сборка Release версии

### iOS
```bash
cd ios
xcodebuild -workspace SuckFy.xcworkspace -scheme SuckFy -configuration Release
```

### Android
```bash
cd android
./gradlew assembleRelease
```

## Troubleshooting

### Metro Bundler не запускается
```bash
watchman watch-del-all
rm -rf node_modules
npm install
npm start -- --reset-cache
```

### Ошибки компиляции iOS
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Dev Menu не открывается
1. Проверьте что приложение в Debug режиме
2. Симулятор должен быть в фокусе
3. Альтернатива: Hardware → Shake Gesture

## Полезные ссылки

- 📖 **Подробное руководство по Dev Menu**: `DEV_MENU_GUIDE.md`
- 🔐 **Как получить SoundCloud OAuth токен**: `SOUNDCLOUD_OAUTH_SETUP.md`
- 📝 **Документация по HLS**: `HLS_IMPLEMENTATION.md`

## Структура проекта

```
src/
├── components/      # UI компоненты
├── contexts/        # React Contexts (Player, Library, Downloads)
├── navigation/      # React Navigation
├── screens/         # Экраны приложения
├── services/        # Бизнес-логика и API
│   ├── SoundCloudService.ts           # SoundCloud API
│   ├── SoundCloudAuthService.ts       # OAuth токены
│   ├── SoundCloudDownloadService.ts   # Скачивание
│   ├── HLSDownloader.ts               # HLS → MP3
│   └── ...
└── theme/          # Цвета и стили
```

Удачной разработки! 🎉
