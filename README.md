# 🎵 SuckFy

> Бесплатный музыкальный плеер в стиле Spotify для macOS — зачем платить за то, что можно собрать самому?

![macOS](https://img.shields.io/badge/macOS-14.0+-black?style=flat&logo=apple)
![Swift](https://img.shields.io/badge/Swift-5.9-orange?style=flat&logo=swift)
![SwiftUI](https://img.shields.io/badge/SwiftUI-5.0-blue?style=flat&logo=swift)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

---

## ✨ Возможности

- 🔍 **Поиск** — Поиск миллионов треков через iTunes API (без регистрации)
- 🔗 **Импорт Spotify URL** — Вставьте любую ссылку на трек Spotify и слушайте мгновенно
- 📥 **Загрузка и кэширование** — Треки загружаются и кэшируются локально для офлайн-воспроизведения
- 🎛️ **12-полосный эквалайзер** — Параметрический эквалайзер с пресетами (Bass Boost, Rock, Pop, Jazz и др.)
- 🌙 **Темная / Светлая тема** — Переключение в боковой панели
- 🎵 **Плеер в строке меню** — Управление воспроизведением из строки меню
- ❤️ **Избранные треки** — Сохраняйте любимые композиции
- 📋 **Плейлисты** — Импорт плейлистов Spotify по URL
- 🔀 **Перемешивание и повтор** — Полный контроль воспроизведения

---

## 🛠 Как это работает

SuckFy использует цепочку бесплатных публичных API для воспроизведения музыки:

```
Поиск:    iTunes Search API → метаданные трека + обложка
          ↓
Воспр.:   Apple Music ID → song.link API → Tidal ID
          ↓
          Tidal ID → spotisaver.net → прямая ссылка на MP4 аудио
          ↓
          AVAudioEngine + AVAudioUnitEQ → 🎵
```

Не требуется аккаунт Spotify. Не нужна подписка.

---

## 📦 Требования

- macOS 14.0 (Sonoma) или новее
- Xcode 15+ (для сборки из исходников)

---

## 🚀 Начало работы

### Сборка из исходников

```bash
git clone https://github.com/6ermutka/SuckFy.git
cd SuckFy
open .swiftpm/xcode/package.xcworkspace
```

Затем нажмите **⌘R** в Xcode для сборки и запуска.

### Или сборка через CLI

```bash
swift build -c release
.build/release/SuckFy
```

### Создание .app

```bash
# Сборка release версии
swift build -c release

# Создание .app bundle
mkdir -p SuckFy.app/Contents/MacOS
mkdir -p SuckFy.app/Contents/Resources
cp .build/release/SuckFy SuckFy.app/Contents/MacOS/
cp SuckFy.icns SuckFy.app/Contents/Resources/
cp Info.plist SuckFy.app/Contents/

# Запуск приложения
open SuckFy.app
```

---

## 🎛️ Полосы эквалайзера

| Полоса | Частота  |
|--------|----------|
| 1      | 60 Гц    |
| 2      | 150 Гц   |
| 3      | 250 Гц   |
| 4      | 500 Гц   |
| 5      | 750 Гц   |
| 6      | 1 кГц    |
| 7      | 1.4 кГц  |
| 8      | 2.5 кГц  |
| 9      | 3.5 кГц  |
| 10     | 4.1 кГц  |
| 11     | 8 кГц    |
| 12     | 16 кГц   |

---

## 📡 Используемые API

| Сервис | Назначение |
|--------|------------|
| [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/) | Поиск треков и метаданные |
| [song.link](https://odesli.co/) | Кросс-платформенное сопоставление треков (Apple Music → Tidal) |
| [spotisaver.net](https://spotisaver.net) | URL аудио-потоков Tidal |

---

## 🏗️ Архитектура проекта

### Структура файлов

```
SuckFy/
├── App/
│   └── MusicPlayerApp.swift      # Точка входа приложения
├── Models/
│   └── Track.swift                # Модель трека
├── Player/
│   └── PlayerCore.swift           # Ядро аудио-плеера (AVAudioEngine)
├── Services/
│   ├── DownloadService.swift      # Загрузка и кэширование треков
│   ├── EqualizerService.swift     # 12-полосный эквалайзер
│   ├── SoundCloudService.swift    # Интеграция с SoundCloud
│   └── SpotifyService.swift       # Интеграция со Spotify
└── Views/
    ├── Components/                # Переиспользуемые UI компоненты
    ├── Equalizer/                 # Интерфейс эквалайзера
    ├── Home/                      # Главный экран
    ├── Main/                      # Основной контейнер
    ├── MenuBar/                   # Виджет строки меню
    ├── NowPlaying/                # Экран текущего трека
    ├── Player/                    # Элементы управления плеером
    ├── Search/                    # Интерфейс поиска
    ├── Sidebar/                   # Боковая панель
    └── SoundCloud/                # Авторизация SoundCloud
```

### Технологии

- **SwiftUI** — Современный декларативный UI фреймворк
- **AVAudioEngine** — Низкоуровневый аудио-движок для воспроизведения
- **AVAudioUnitEQ** — Параметрический эквалайзер
- **URLSession** — Работа с сетевыми запросами и загрузкой треков
- **AppStorage** — Персистентное хранение настроек
- **Combine** — Реактивное программирование

### Основные компоненты

#### PlayerCore
Центральный класс, управляющий:
- Воспроизведением треков через AVAudioEngine
- Очередью воспроизведения
- Режимами shuffle/repeat
- Интеграцией с эквалайзером

#### DownloadService
- Загрузка треков с кэшированием
- Управление локальным хранилищем
- Прогресс загрузки

#### EqualizerService
- 12 настраиваемых частотных полос
- Предустановленные пресеты
- Реалтайм обработка аудио

#### SpotifyService & SoundCloudService
- Парсинг URL треков и плейлистов
- Получение метаданных
- Конвертация в универсальный формат Track

---

## ⚠️ Дисклеймер

Этот проект создан **исключительно в образовательных целях**. Авторы не поддерживают пиратство. Пожалуйста, поддерживайте артистов, покупая их музыку или используя легальные стриминговые сервисы.

---

## 🙏 Благодарности

- Вдохновлено проектами [SpotiDownloader](https://github.com/afkarxyz/SpotiDownloader) и [SpotiFLAC](https://github.com/afkarxyz/SpotiFLAC)
- Создано с ❤️ и SwiftUI

---

*SuckFy — Потому что Spotify высасывает деньги из вашего кошелька* 😄
