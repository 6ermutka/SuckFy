# 🎵 SuckFy

> A free Spotify-like music player for macOS — because why pay for something you can build yourself?

![macOS](https://img.shields.io/badge/macOS-14.0+-black?style=flat&logo=apple)
![Swift](https://img.shields.io/badge/Swift-5.9-orange?style=flat&logo=swift)
![SwiftUI](https://img.shields.io/badge/SwiftUI-5.0-blue?style=flat&logo=swift)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

---

## ✨ Features

- 🔍 **Search** — Search millions of tracks via iTunes API (no account needed)
- 🔗 **Spotify URL import** — Paste any Spotify track link and play it instantly
- 📥 **Download & Cache** — Tracks are downloaded and cached locally for offline playback
- 🎛️ **12-Band Equalizer** — Parametric EQ with presets (Bass Boost, Rock, Pop, Jazz, etc.)
- 🌙 **Dark / Light mode** — Toggle in the sidebar
- 🎵 **Menu Bar player** — Control playback from the menu bar
- ❤️ **Liked Songs** — Save your favourite tracks
- 📋 **Playlists** — Import Spotify playlists by URL
- 🔀 **Shuffle & Repeat** — Full playback controls

---

## 🛠 How It Works

SuckFy uses a chain of free public APIs to stream music:

```
Search:   iTunes Search API → track metadata + artwork
          ↓
Play:     Apple Music ID → song.link API → Tidal ID
          ↓
          Tidal ID → spotisaver.net → direct MP4 audio URL
          ↓
          AVAudioEngine + AVAudioUnitEQ → 🎵
```

No Spotify account required. No subscription needed.

---

## 📦 Requirements

- macOS 14.0 (Sonoma) or later
- Xcode 15+ (to build from source)

---

## 🚀 Getting Started

### Build from source

```bash
git clone https://github.com/6ermutka/SuckFy.git
cd SuckFy
open .swiftpm/xcode/package.xcworkspace
```

Then press **⌘R** in Xcode to build and run.

### Or build via CLI

```bash
swift build
.build/debug/SuckFy
```

---

## 🎛️ Equalizer Bands

| Band | Frequency |
|------|-----------|
| 1    | 60 Hz     |
| 2    | 150 Hz    |
| 3    | 250 Hz    |
| 4    | 500 Hz    |
| 5    | 750 Hz    |
| 6    | 1 kHz     |
| 7    | 1.4 kHz   |
| 8    | 2.5 kHz   |
| 9    | 3.5 kHz   |
| 10   | 4.1 kHz   |
| 11   | 8 kHz     |
| 12   | 16 kHz    |

---

## 📡 APIs Used

| Service | Purpose |
|---------|---------|
| [iTunes Search API](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/) | Track search & metadata |
| [song.link](https://odesli.co/) | Cross-platform track matching (Apple Music → Tidal) |
| [spotisaver.net](https://spotisaver.net) | Tidal audio stream URLs |

---

## ⚠️ Disclaimer

This project is for **educational purposes only**. The authors do not condone piracy. Please support artists by purchasing their music or using legal streaming services.

---

## 🙏 Credits

- Inspired by [SpotiDownloader](https://github.com/afkarxyz/SpotiDownloader) and [SpotiFLAC](https://github.com/afkarxyz/SpotiFLAC)
- Built with ❤️ and SwiftUI

---

*SuckFy — Because Spotify sucks your wallet dry* 😄
