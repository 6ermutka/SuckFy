# 🤖 Android Development Guide для macOS

## Быстрый старт

### Способ 1: Автоматический запуск (рекомендуется)

**Терминал 1 - Metro Bundler:**
```bash
npm start
```

**Терминал 2 - Android App:**
```bash
npm run android
```

Metro Bundler автоматически откроется и покажет все логи приложения.

### Способ 2: Параллельный запуск (одна команда)

```bash
npm run dev:android
```

## 🎯 Dev Menu на Android

### Открытие Dev Menu

**На эмуляторе:**
- **Cmd + M** (на macOS)
- **Ctrl + M** (на Windows/Linux)

**На физическом устройстве:**
- Потрясите устройство
- Или: `adb shell input keyevent 82`

### Горячие клавиши

```bash
# Открыть Dev Menu
adb shell input keyevent 82

# Перезагрузить приложение
adb shell input text "RR"

# Включить/выключить Remote Debugging
# Через Dev Menu → "Debug JS Remotely"
```

## 📱 Управление устройствами

### Проверка подключенных устройств

```bash
adb devices -l
```

### Запуск эмулятора

```bash
# Список доступных эмуляторов
emulator -list-avds

# Запустить конкретный эмулятор
emulator -avd Pixel_5_API_34 &

# Или через Android Studio: Tools → Device Manager
```

### Установка на конкретное устройство

```bash
# Если подключено несколько устройств
npx react-native run-android --deviceId=<DEVICE_ID>

# Узнать DEVICE_ID
adb devices
```

## 📝 Просмотр логов

### Вариант 1: Metro Bundler (рекомендуется)
Все `console.log()` автоматически отображаются в терминале где запущен `npm start`

### Вариант 2: Logcat (системные логи Android)

```bash
# Все логи приложения
adb logcat -s ReactNativeJS:V ReactNative:V SuckFy:V

# Только ошибки
adb logcat -s ReactNativeJS:E ReactNative:E

# Очистить логи и начать с чистого листа
adb logcat -c && adb logcat -s ReactNativeJS:V ReactNative:V

# Фильтр по SoundCloud
adb logcat | grep SOUNDCLOUD

# Фильтр по OAuth
adb logcat | grep SC_AUTH
```

### Вариант 3: Chrome DevTools

1. Откройте Dev Menu (Cmd + M)
2. Выберите **"Debug JS Remotely"**
3. Chrome откроется автоматически на `http://localhost:8081/debugger-ui/`
4. Откройте Console (Cmd + Option + J)

### Вариант 4: React Native Debugger

```bash
# Установка
brew install --cask react-native-debugger

# Запуск
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

Затем в Dev Menu → "Debug JS Remotely"

## 🔧 Полезные команды

### Очистка и пересборка

```bash
# Очистить билд Android
cd android && ./gradlew clean && cd ..

# Очистить Metro cache
npm start -- --reset-cache

# Полная очистка
npm run reset
```

### Установка/переустановка приложения

```bash
# Установить APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Переустановить (сохранить данные)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Удалить приложение
adb uninstall com.suckfy
```

### Управление приложением

```bash
# Запустить приложение
adb shell am start -n com.suckfy/.MainActivity

# Остановить приложение
adb shell am force-stop com.suckfy

# Очистить данные приложения
adb shell pm clear com.suckfy
```

## 🐛 Отладка

### Инспекция элементов UI

1. Dev Menu → "Toggle Inspector"
2. Нажимайте на элементы чтобы увидеть их стили и props

### Performance Monitor

Dev Menu → "Show Perf Monitor"

Показывает:
- JS FPS
- UI FPS  
- Memory usage
- Bridge stats

### Network Inspector

**Способ 1: Chrome DevTools**
1. Dev Menu → "Debug JS Remotely"
2. Network tab в Chrome

**Способ 2: Flipper**
```bash
brew install --cask flipper
```

Запустите Flipper и приложение - Flipper автоматически обнаружит его.

## 🏗️ Билд APK

### Debug APK

```bash
cd android
./gradlew assembleDebug
cd ..

# APK будет в:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK

```bash
cd android
./gradlew assembleRelease
cd ..

# APK будет в:
# android/app/build/outputs/apk/release/app-release.apk
```

### Установка собранного APK

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## 📊 Мониторинг логов SoundCloud

Все логи SoundCloud помечены эмодзи:

```bash
# В Metro Bundler увидите:
🚀 [APP] Initializing services...
🔐 [SC_AUTH] Token loaded: ✅ Present
🔍 [SOUNDCLOUD] Searching with OAuth token: test
✅ [SOUNDCLOUD] Found 20 tracks
```

### Фильтрация в logcat:

```bash
# Только SoundCloud
adb logcat | grep SOUNDCLOUD

# Только OAuth
adb logcat | grep SC_AUTH

# Только ошибки
adb logcat | grep "❌"
```

## ⚙️ Настройка Android Studio

### Включить USB Debugging на физическом устройстве

1. Settings → About phone
2. Нажмите 7 раз на "Build number"
3. Settings → Developer options → USB debugging ON
4. Подключите по USB
5. Разрешите отладку на устройстве

### Беспроводная отладка (Android 11+)

```bash
# На устройстве: Developer options → Wireless debugging
adb pair <IP>:<PORT>
adb connect <IP>:<PORT>
adb devices
```

## 🔄 Workflow для разработки

**Рекомендуемый setup:**

1. **Терминал 1:** `npm start` (Metro Bundler)
2. **Терминал 2:** `adb logcat -s ReactNativeJS:V` (опционально)
3. **Эмулятор/устройство:** Запустите `npm run android`
4. **Dev Menu:** Cmd + M → Enable Hot Reloading
5. Разрабатывайте с открытым Metro Bundler для логов

## ❓ Troubleshooting

### Metro Bundler не запускается

```bash
watchman watch-del-all
rm -rf node_modules
rm -rf $TMPDIR/react-*
npm install
npm start -- --reset-cache
```

### Ошибка "SDK location not found"

Создайте `android/local.properties`:
```
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

### Ошибка "Could not connect to development server"

1. Убедитесь что Metro Bundler запущен
2. На эмуляторе: Dev Menu → Settings → Debug server host = `localhost:8081`
3. На физическом устройстве: Используйте IP вашего Mac

```bash
# Узнать IP Mac
ifconfig | grep "inet " | grep -v 127.0.0.1

# На устройстве в Dev Menu Settings:
# Debug server host: <YOUR_MAC_IP>:8081
```

### Dev Menu не открывается

```bash
# Принудительно открыть через adb
adb shell input keyevent 82
```

### Приложение крашится при запуске

```bash
# Посмотреть crash logs
adb logcat -s AndroidRuntime:E

# Очистить данные и переустановить
adb uninstall com.suckfy
npm run android
```

## 📱 Рекомендуемые эмуляторы

- **Pixel 5** API 34 (Android 14)
- **Pixel 7** API 33 (Android 13)
- Минимум **2GB RAM**, лучше 4GB
- **x86_64** образ с Google Play

## 🎉 Готово к разработке!

```bash
# Быстрый старт:
npm start                # Терминал 1
npm run android          # Терминал 2
# Cmd + M → Dev Menu
```

Смотрите логи в Metro Bundler терминале! 📝
