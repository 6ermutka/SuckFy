# 🎵 SuckFy - Руководство разработчика

## ✅ Что реализовано

### OAuth авторизация SoundCloud
- ✅ Сервис управления OAuth токенами (`SoundCloudAuthService`)
- ✅ Поле ввода токена в настройках
- ✅ Автоматическая валидация токена через API
- ✅ Сохранение/загрузка токена через AsyncStorage
- ✅ Интеграция в `SoundCloudService` (автоматическое использование)
- ✅ Fallback на публичные client_id если токен отсутствует

### Dev Menu для macOS
- ✅ Настроены npm скрипты для разработки
- ✅ Dev Menu доступен через Cmd + D
- ✅ Подробная документация в `DEV_MENU_GUIDE.md`
- ✅ Логирование всех сервисов с эмодзи маркерами
- ✅ Автоматическая инициализация OAuth токена при запуске

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
npm install
```

### 2. Запуск для разработки (2 терминала)

**Терминал 1:**
```bash
npm start
# или с подробными логами
npm run dev
```

**Терминал 2:**
```bash
npm run ios
```

### 3. Открытие Dev Menu
В iOS симуляторе нажмите **Cmd + D**

Доступные опции:
- **Enable Hot Reloading** - автоперезагрузка при изменении кода
- **Debug JS Remotely** - Chrome DevTools
- **Toggle Inspector** - инспекция элементов UI
- **Show Perf Monitor** - метрики производительности

## 🔐 Настройка SoundCloud OAuth

### Получение токена

1. Откройте SoundCloud в браузере и авторизуйтесь
2. Откройте Developer Tools (F12)
3. Console → выполните:

```javascript
const token = Object.keys(localStorage)
  .filter(key => key.includes('oauth'))
  .map(key => localStorage[key])
  .find(val => val && val.includes('oauth_token'));

if (token) {
  const parsed = JSON.parse(token);
  console.log('OAuth Token:', parsed.oauth_token);
  copy(parsed.oauth_token);
  console.log('✅ Токен скопирован!');
}
```

4. Токен скопирован в буфер обмена

### Добавление в приложение

1. Запустите приложение
2. Перейдите в **Settings**
3. Секция **SoundCloud OAuth**
4. Вставьте токен
5. Нажмите **Сохранить токен**
6. Приложение валидирует токен автоматически
7. При успехе: **✅ Токен активен**

## 📝 Логирование

Все сервисы используют эмодзи для удобного поиска в логах:

```
🚀 [APP]          - Инициализация приложения
🔍 [SOUNDCLOUD]   - Поиск треков
🔗 [SOUNDCLOUD]   - Получение информации о треке  
🎵 [SOUNDCLOUD]   - Stream URL
🔐 [SC_AUTH]      - OAuth токен
✅                - Успешные операции
❌                - Ошибки
⚠️                 - Предупреждения
```

### Фильтрация логов в терминале

```bash
# Только SoundCloud
npm start | grep SOUNDCLOUD

# Только OAuth
npm start | grep SC_AUTH

# Только ошибки
npm start | grep "❌"
```

## 🛠 Полезные команды

```bash
# Разработка с подробными логами
npm run dev

# iOS логи устройства
npm run logs:ios

# Очистка кэша
npm run reset

# Android
npm run android
npm run dev:android
```

## 📂 Новые файлы

```
src/services/
└── SoundCloudAuthService.ts  # Управление OAuth токенами

src/screens/
└── SettingsScreen.tsx         # Добавлена секция OAuth

.vscode/
└── settings.json              # VSCode настройки для RN

Документация:
├── QUICK_START.md             # Быстрый старт
├── DEV_MENU_GUIDE.md          # Подробно про Dev Menu
└── SOUNDCLOUD_OAUTH_SETUP.md  # Как получить OAuth токен
```

## 🔄 Как работает OAuth

1. **При запуске приложения** (`App.tsx`):
   - Загружается сохраненный токен из AsyncStorage
   
2. **При поиске/скачивании** (`SoundCloudService.ts`):
   - Проверяется наличие OAuth токена
   - Если есть → использует `Authorization: OAuth {token}`
   - Если нет → использует `client_id` в URL
   
3. **В настройках** (`SettingsScreen.tsx`):
   - Ввод токена
   - Валидация через `/me` endpoint
   - Сохранение в AsyncStorage
   - Отображение статуса

## 🎯 Преимущества OAuth токена

✅ Доступ к приватным трекам
✅ Ваши плейлисты и лайки
✅ Высокие лимиты API
✅ Go+ контент (если есть подписка)
✅ Меньше rate limiting

## ⚡️ Работа без токена

Приложение полностью работает и без OAuth токена:
- Используются публичные `client_id`
- Доступны публичные треки
- Автоматическое переключение между client_id при ошибках
- Меньше возможностей, но стабильно

## 🐛 Отладка

### Chrome DevTools
1. Dev Menu (Cmd + D)
2. "Debug JS Remotely"
3. Chrome откроется автоматически
4. Console / Sources / Network

### React DevTools
```bash
# Установите глобально
npm install -g react-devtools
# Запустите
react-devtools
```

### Flipper (опционально)
```bash
brew install --cask flipper
# Запустите Flipper, затем приложение
```

## 📚 Дополнительная документация

- `QUICK_START.md` - Быстрый старт разработки
- `DEV_MENU_GUIDE.md` - Полное руководство по Dev Menu
- `SOUNDCLOUD_OAUTH_SETUP.md` - Детально про OAuth токен
- `HLS_IMPLEMENTATION.md` - Документация HLS скачивания

---

**Готово к разработке!** 🎉

Откройте 2 терминала:
1. `npm start`
2. `npm run ios`

И нажмите **Cmd + D** в симуляторе для Dev Menu
