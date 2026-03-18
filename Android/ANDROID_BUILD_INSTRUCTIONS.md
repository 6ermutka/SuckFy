# 🚀 Android Build Instructions для macOS

## Перед началом

### Установка Android SDK (если еще не установлен)

1. **Установите Android Studio:**
   ```bash
   # Через Homebrew
   brew install --cask android-studio
   
   # Или скачайте с https://developer.android.com/studio
   ```

2. **Настройте environment variables в `~/.zshrc` или `~/.bash_profile`:**
   ```bash
   # Android SDK
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   ```

3. **Перезагрузите terminal:**
   ```bash
   source ~/.zshrc
   # или
   source ~/.bash_profile
   ```

4. **Проверьте установку:**
   ```bash
   adb --version
   # Должно показать версию adb
   ```

## 🏗️ Сборка приложения

### Способ 1: Автоматический билд-скрипт (рекомендуется)

```bash
npm run build:android
# или
./BUILD_ANDROID.sh
```

Скрипт автоматически:
- ✅ Проверит зависимости
- ✅ Спросит про очистку старого билда
- ✅ Соберет Debug APK
- ✅ Найдет подключенные устройства
- ✅ Предложит установить APK
- ✅ Предложит запустить приложение

### Способ 2: Gradle напрямую

```bash
# Debug APK
cd android
./gradlew assembleDebug
cd ..

# Release APK
cd android
./gradlew assembleRelease
cd ..
```

### Способ 3: Через React Native CLI

```bash
# Сборка и установка на устройство
npx react-native run-android

# На конкретное устройство
npx react-native run-android --deviceId=DEVICE_ID
```

## 📦 Где найти собранный APK

### Debug APK:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK:
```
android/app/build/outputs/apk/release/app-release.apk
```

## 📱 Подключение устройства

### Вариант 1: Физическое устройство

1. **Включите USB Debugging на устройстве:**
   - Settings → About phone
   - Нажмите 7 раз на "Build number"
   - Settings → Developer options → USB debugging ON

2. **Подключите через USB**

3. **Проверьте подключение:**
   ```bash
   adb devices
   ```

4. **Разрешите отладку на устройстве** (появится диалог)

### Вариант 2: Android Emulator

1. **Запустите Android Studio**
2. **Tools → Device Manager**
3. **Создайте или запустите эмулятор**
4. **Проверьте:**
   ```bash
   adb devices
   ```

### Вариант 3: Командная строка

```bash
# Список доступных эмуляторов
emulator -list-avds

# Запустить эмулятор
emulator -avd Pixel_5_API_34 &
```

## 🚀 Запуск приложения

### Автоматический запуск (с Metro Bundler)

**Терминал 1:**
```bash
npm start
```

**Терминал 2:**
```bash
npm run android
```

### Установка готового APK

```bash
# Список устройств
npm run device:list

# Установить APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Переустановить (сохранить данные)
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Запустить приложение
adb shell am start -n com.suckfy/.MainActivity
```

## 🎯 Dev Menu

### Открыть Dev Menu

**На эмуляторе:**
```bash
# Через клавиатуру
Cmd + M  (macOS)
Ctrl + M (Windows/Linux)

# Через команду
npm run device:menu
# или
adb shell input keyevent 82
```

**На физическом устройстве:**
- Потрясите устройство
- Или: `adb shell input keyevent 82`

### Опции Dev Menu

- **Reload** - Перезагрузить приложение
- **Debug JS Remotely** - Chrome DevTools
- **Enable Live Reload** - Авто-перезагрузка при изменениях
- **Enable Hot Reloading** - Горячая замена без перезагрузки
- **Toggle Inspector** - Инспекция UI элементов
- **Show Perf Monitor** - Мониторинг производительности

## 📝 Просмотр логов

### Metro Bundler логи (рекомендуется)

```bash
npm start
# Все console.log() будут здесь
```

### Android Logcat

```bash
# Все логи приложения
npm run logs:android

# Или напрямую
adb logcat -s ReactNativeJS:V ReactNative:V

# Фильтр по SoundCloud
adb logcat | grep SOUNDCLOUD

# Фильтр по OAuth
adb logcat | grep SC_AUTH

# Только ошибки
adb logcat -s ReactNativeJS:E AndroidRuntime:E
```

### Chrome DevTools

1. Dev Menu → "Debug JS Remotely"
2. Chrome откроется на `http://localhost:8081/debugger-ui/`
3. Cmd + Option + J → Console

## 🧹 Очистка

```bash
# Очистить Android build
npm run clean:android

# Очистить Metro cache
npm run reset

# Полная очистка
npm run clean:android
rm -rf node_modules
npm install
```

## 🛠️ Полезные команды

```bash
# Список устройств
npm run device:list

# Открыть Dev Menu
npm run device:menu

# Логи Android
npm run logs:android

# Сборка Debug
npm run build:android:debug

# Сборка Release
npm run build:android:release

# Очистка
npm run clean:android
```

## ⚡️ Быстрый workflow для разработки

### Setup (один раз):

1. Запустите эмулятор или подключите устройство
2. Проверьте: `adb devices`

### Разработка (каждый раз):

**Терминал 1 - Metro Bundler:**
```bash
npm start
```

**Терминал 2 - Первый запуск:**
```bash
npm run android
```

**После первого запуска:**
- Приложение уже установлено
- Metro Bundler работает
- Включите Hot Reload в Dev Menu (Cmd + M)
- Просто редактируйте код - изменения применятся автоматически
- Смотрите логи в терминале Metro Bundler

## ❓ Troubleshooting

### "ANDROID_HOME not set"

Добавьте в `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Затем: `source ~/.zshrc`

### "SDK location not found"

Создайте `android/local.properties`:
```
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

### "Could not connect to development server"

1. Metro Bundler должен быть запущен
2. Dev Menu → Settings → Debug server host = `localhost:8081`

### Build failed

```bash
# Очистить и пересобрать
npm run clean:android
cd android
./gradlew assembleDebug --stacktrace
```

### No devices found

```bash
# Проверить устройства
adb devices

# Перезапустить adb server
adb kill-server
adb start-server
adb devices
```

## 🎉 Готово!

**Минимальный workflow:**

```bash
# Терминал 1
npm start

# Терминал 2
npm run android

# В эмуляторе/устройстве
# Cmd + M → Enable Hot Reloading
```

**Логи будут в терминале 1!** 📝

Для детальной документации смотрите `ANDROID_DEV_GUIDE.md`
