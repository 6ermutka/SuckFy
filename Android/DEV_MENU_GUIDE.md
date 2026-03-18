# Руководство по Dev Menu на macOS

## Запуск приложения с Dev Menu

### Способ 1: Запуск через npm скрипт с автоматическим открытием Metro Bundler

Добавьте в `package.json` новые скрипты:

```bash
# Для iOS (запускает Metro Bundler и iOS симулятор)
npm run dev:ios

# Только Metro Bundler с логами в терминале
npm run dev
```

### Способ 2: Ручной запуск в двух терминалах

**Терминал 1 - Metro Bundler с логами:**
```bash
npm start
```

**Терминал 2 - Запуск iOS симулятора:**
```bash
npm run ios
# или для Android:
npm run android
```

## Открытие Dev Menu

### На iOS симуляторе:
- **Cmd + D** - открыть Dev Menu
- **Cmd + R** - перезагрузить приложение
- **Cmd + Ctrl + Z** - включить/выключить Element Inspector

### На Android эмуляторе:
- **Cmd + M** - открыть Dev Menu
- **R + R** (дважды R) - перезагрузить приложение

## Полезные опции Dev Menu

### 1. **Enable Live Reload**
Автоматически перезагружает приложение при сохранении файлов

### 2. **Enable Hot Reloading**
Применяет изменения без полной перезагрузки (сохраняет state)

### 3. **Toggle Inspector**
Позволяет инспектировать элементы UI, видеть их свойства и стили

### 4. **Show Perf Monitor**
Показывает метрики производительности:
- FPS (frames per second)
- JS thread performance
- UI thread performance
- Memory usage

### 5. **Debug JS Remotely**
Открывает Chrome DevTools для отладки JavaScript:
- Breakpoints
- Console logs
- Network requests
- Source maps

### 6. **Open React DevTools**
Открывает React DevTools для инспекции компонентов

## Просмотр логов

### Метод 1: В терминале Metro Bundler
Все `console.log()` будут отображаться в терминале где запущен `npm start`

### Метод 2: React Native Debugger (рекомендуется)
1. Установите React Native Debugger:
   ```bash
   brew install --cask react-native-debugger
   ```

2. Запустите приложение
3. Откройте Dev Menu (Cmd + D)
4. Выберите "Debug JS Remotely"
5. React Native Debugger откроется автоматически

### Метод 3: Chrome DevTools
1. Откройте Dev Menu (Cmd + D)
2. Выберите "Debug JS Remotely"
3. Откроется вкладка Chrome на `http://localhost:8081/debugger-ui/`
4. Откройте Console (F12 или Cmd + Option + J)

### Метод 4: Flipper (продвинутая отладка)
1. Установите Flipper:
   ```bash
   brew install --cask flipper
   ```

2. Запустите Flipper
3. Запустите приложение - Flipper автоматически обнаружит его
4. Доступны:
   - Network Inspector
   - Layout Inspector
   - Logs
   - Crash Reporter
   - Databases
   - AsyncStorage

## Отладка SoundCloud сервиса

Все логи SoundCloud помечены эмодзи для удобного поиска:
- 🔍 - Поиск треков
- 🔗 - Получение информации о треке
- 🎵 - Получение stream URL
- 🔐 - OAuth авторизация
- ✅ - Успешные операции
- ❌ - Ошибки
- ⚠️ - Предупреждения

Фильтруйте логи в терминале:
```bash
# Только SoundCloud логи
npm start | grep SOUNDCLOUD

# Только OAuth логи
npm start | grep SC_AUTH
```

## Быстрые команды для разработки

```bash
# Очистить кэш и пересобрать
npm start -- --reset-cache

# Запустить на конкретном iOS устройстве
npx react-native run-ios --simulator="iPhone 15 Pro"

# Запустить на физическом iOS устройстве
npx react-native run-ios --device

# Посмотреть доступные симуляторы
xcrun simctl list devices

# Очистить билд iOS
cd ios && xcodebuild clean && cd ..

# Очистить билд Android
cd android && ./gradlew clean && cd ..
```

## Проблемы и решения

### Metro Bundler не запускается
```bash
# Очистить временные файлы
watchman watch-del-all
rm -rf $TMPDIR/react-*
rm -rf node_modules
npm install
```

### Логи не отображаются
1. Убедитесь что используете `console.log()` а не `console.debug()`
2. Проверьте что Metro Bundler запущен
3. Откройте Remote Debugger для полного доступа к консоли

### Dev Menu не открывается
1. Убедитесь что приложение в режиме Debug (не Release)
2. Проверьте что симулятор в фокусе
3. Попробуйте альтернативу: Hardware > Shake Gesture (в iOS Simulator)

## Рекомендуемый workflow

1. **Терминал 1**: `npm start` - Metro Bundler с логами
2. **Терминал 2**: `npm run ios` - iOS симулятор
3. **Браузер**: Chrome DevTools для детальной отладки
4. **Cmd + D** в симуляторе -> Enable Hot Reloading
5. Разрабатывайте с открытым терминалом Metro Bundler для мониторинга логов
