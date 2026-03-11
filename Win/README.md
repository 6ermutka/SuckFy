# 🎵 SuckFy - Music Player for Windows

Музыкальный плеер с поддержкой SoundCloud, Spotify и локальных файлов. Построен на Electron + React + TypeScript.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)

## 🎨 Дизайн

Полностью повторяет дизайн оригинального macOS приложения SuckFy:
- Темная тема с vibrancy эффектами
- Боковая панель с навигацией
- Главная страница с Recently Played и Liked Songs
- Поиск по Spotify и SoundCloud
- Библиотека загруженных треков
- Настройки
- Нижний плеер с управлением

## 🚀 Запуск проекта

### Режим разработки (только React UI)

```bash
npm run dev
```

Откройте браузер на http://localhost:5173

### Запуск с Electron

```bash
npm run electron:dev
```

### Сборка для Windows

```bash
npm run electron:build
```

## 📁 Структура проекта

```
SuckFy-Windows/
├── src/
│   ├── components/
│   │   ├── views/
│   │   │   ├── HomeView.tsx          # Главная страница
│   │   │   ├── SearchView.tsx        # Поиск
│   │   │   ├── LibraryView.tsx       # Библиотека
│   │   │   ├── LikedSongsView.tsx    # Избранные песни
│   │   │   └── SettingsView.tsx      # Настройки
│   │   ├── Sidebar.tsx               # Боковая панель
│   │   ├── MainContent.tsx           # Основной контент
│   │   └── Player.tsx                # Плеер внизу
│   ├── styles/                       # CSS файлы
│   ├── App.tsx                       # Главный компонент
│   └── main.tsx                      # Точка входа React
├── electron/
│   ├── main.js                       # Главный процесс Electron
│   └── preload.js                    # Preload скрипт
├── public/                           # Статические файлы
├── index.html                        # HTML шаблон
├── vite.config.ts                    # Конфигурация Vite
├── tsconfig.json                     # Конфигурация TypeScript
└── package.json
```

## 🎯 Реализованные компоненты (GUI)

### ✅ Готово
- [x] Sidebar с навигацией
- [x] Home View (Recently Played, Liked Songs)
- [x] Search View (Spotify/SoundCloud вкладки)
- [x] Library View (Downloaded Tracks с фильтрами)
- [x] Liked Songs View
- [x] Settings View (Language, Storage, Import)
- [x] Player (управление воспроизведением)
- [x] Темная/светлая тема

### 🔜 Следующие шаги (Backend/Логика)
- [ ] Интеграция с Spotify API
- [ ] Интеграция с SoundCloud (yt-dlp)
- [ ] Аудио плеер (Web Audio API)
- [ ] Система кэширования
- [ ] Управление библиотекой
- [ ] Импорт локальных файлов
- [ ] Плейлисты

## 🛠️ Технологии

- **Electron** - Desktop приложение
- **React 18** - UI фреймворк
- **TypeScript** - Типизация
- **Vite** - Сборщик и dev server
- **CSS** - Стилизация (без фреймворков, чистый CSS)

## 📝 Примечания

Текущая версия содержит только GUI без backend логики. Все данные статические (mock data). 
Следующий этап - добавление функциональности (API интеграции, аудио плеер, кэширование и т.д.).

## 🎨 Дизайн Reference

Оригинальный дизайн взят из macOS версии SuckFy:
https://github.com/6ermutka/SuckFy
