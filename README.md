# SuckFy

🎵 **SuckFy** - удобный музыкальный плеер для macOS с поддержкой Spotify и SoundCloud.

A convenient music player for macOS with Spotify and SoundCloud support.

## ✨ Features / Возможности

- 🎵 **Multi-source playback** - Spotify, SoundCloud, and local files
- 💾 **Smart caching** - Automatic download and offline playback
- 📚 **Library management** - Downloaded tracks with filters (Spotify/SoundCloud/Import)
- 📥 **Import local tracks** - Add your MP3, M4A, FLAC files
- ❤️ **Playlists & Likes** - Create playlists and save favorite songs
- 🎨 **Native macOS UI** - Beautiful SwiftUI interface
- 🌍 **Bilingual** - Full English/Russian localization
- 🌙 **Dark/Light themes** - System-integrated theme switching
- ⚙️ **Customizable** - Change cache location, manage storage

## 🚀 Requirements / Требования

- macOS 14.0+
- yt-dlp (for SoundCloud)
- ffmpeg (for audio conversion)

## 📦 Installation / Установка

### Via Homebrew (dependencies):
```bash
brew install yt-dlp ffmpeg
```

### Download & Run:
1. Download `SuckFy.app` from [Releases](https://github.com/YOUR_USERNAME/SuckFy/releases)
2. Move to Applications folder
3. Open and enjoy!

## 🎯 Usage / Использование

1. **Search** - Find tracks from Spotify or paste SoundCloud links
2. **Import** - Add your local music files (Settings → Import)
3. **Library** - View all downloaded tracks with source filters
4. **Settings** - Change language (EN/RU), manage cache, import files

## 🛠️ Build from Source

```bash
git clone https://github.com/YOUR_USERNAME/SuckFy.git
cd SuckFy
swift build -c release
open SuckFy.app
```

## 📝 License

MIT License - feel free to use and modify!

---

Made with ❤️ for music lovers
