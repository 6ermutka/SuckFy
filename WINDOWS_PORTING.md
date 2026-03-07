# 🪟 Руководство по портированию SuckFy на Windows

> **Адресовано:** AI-агентам и разработчикам, работающим над портированием SuckFy с macOS на Windows

---

## 📋 Обзор проекта

**SuckFy** — музыкальный плеер для macOS, написанный на Swift с использованием SwiftUI. Приложение воспроизводит музыку через цепочку бесплатных API и использует нативные macOS фреймворки для аудио.

### Текущий стек технологий (macOS)
- **Язык:** Swift 5.9+
- **UI:** SwiftUI 5.0
- **Аудио-движок:** AVAudioEngine + AVAudioUnitEQ
- **Сеть:** URLSession
- **Платформа:** macOS 14.0+ (Sonoma)

---

## 🎯 Цели портирования

1. **Сохранить функциональность:** Все возможности должны работать на Windows
2. **Нативный UX:** Интерфейс должен соответствовать Windows UI guidelines
3. **Производительность:** Без потери производительности аудио-воспроизведения
4. **Поддерживаемость:** Чистый, документированный код

---

## 🔄 Стратегии портирования

### Вариант 1: Swift на Windows (рекомендуется)

**Преимущества:**
- Переиспользование большей части логики
- Минимальные изменения в бизнес-логике
- Swift официально поддерживает Windows

**Недостатки:**
- SwiftUI не поддерживается на Windows
- Нужна альтернатива AVAudioEngine

**Технологический стек:**
```
Язык: Swift 5.9+ (Windows toolchain)
UI: WinUI 3 / Windows App SDK (через C++ interop)
    или Qt for Swift
    или Electron + Swift backend
Аудио: BASS Audio Library / PortAudio / miniaudio
Сеть: Swift Foundation (URLSession работает на Windows)
```

### Вариант 2: C# + .NET (альтернатива)

**Преимущества:**
- Идеальная интеграция с Windows
- WinUI 3 / MAUI для UI
- NAudio для аудио

**Недостатки:**
- Полная переписка кода
- Другой язык программирования

**Технологический стек:**
```
Язык: C# 12 + .NET 8
UI: WinUI 3 / MAUI
Аудио: NAudio / CSCore
Сеть: HttpClient
```

### Вариант 3: Flutter (кросс-платформа)

**Преимущества:**
- Один код для macOS + Windows
- Современный UI toolkit

**Недостатки:**
- Полная переписка
- Dart вместо Swift

---

## 🏗️ Архитектура: Компоненты и их портирование

### 1. **App/MusicPlayerApp.swift** — Точка входа

#### macOS (текущая реализация):
```swift
@main
struct DotifyApp: App {
    @StateObject private var player = PlayerCore()
    var body: some Scene {
        Window("SuckFy", id: "main") {
            MainView()
                .environmentObject(player)
        }
        MenuBarExtra { ... }
    }
}
```

#### Windows (Swift + WinUI 3):
```swift
// Потребуется C++ interop для создания WinUI окна
// Рассмотрите использование Windows App SDK
```

#### Windows (C#):
```csharp
public partial class App : Application
{
    private PlayerCore _player;
    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        _player = new PlayerCore();
        var window = new MainWindow();
        window.Activate();
    }
}
```

**Рекомендации:**
- Используйте Dependency Injection для PlayerCore
- Реализуйте Windows Notification Area вместо MenuBarExtra

---

### 2. **Models/Track.swift** — Модель данных

#### Текущая реализация:
```swift
struct Track: Identifiable, Codable {
    let id: String
    let title: String
    let artist: String
    let artworkURL: URL?
    // ...
}
```

**Портирование:**
- ✅ **Swift на Windows:** Код переносится 1:1
- ✅ **C#:** Простой перевод в C# класс/record
- Используйте JSON serialization для кэширования

---

### 3. **Player/PlayerCore.swift** — Аудио-движок ⚠️ КРИТИЧЕСКИЙ КОМПОНЕНТ

#### macOS (текущая реализация):
```swift
class PlayerCore: ObservableObject {
    private let audioEngine = AVAudioEngine()
    private let playerNode = AVAudioPlayerNode()
    private let eq = AVAudioUnitEQ(numberOfBands: 12)
    
    func play(track: Track) {
        // AVAudioEngine setup
    }
}
```

#### Windows — Варианты замены AVAudioEngine:

##### Option A: BASS Audio Library (рекомендуется)
```swift
// Swift + BASS через C interop
import BASS

class PlayerCore {
    private var stream: HSTREAM?
    private var eqHandle: HFX?
    
    func play(url: URL) {
        stream = BASS_StreamCreateURL(url.absoluteString, ...)
        BASS_ChannelPlay(stream, false)
    }
    
    func applyEQ(band: Int, gain: Float) {
        // BASS_FXSetParameters
    }
}
```

**BASS Audio Library:**
- Website: https://www.un4seen.com/
- Поддерживает: MP3, MP4, AAC, FLAC, WAV
- 12+ band EQ через BASS_FX
- Бесплатно для некоммерческого использования

##### Option B: NAudio (C# only)
```csharp
using NAudio.Wave;

public class PlayerCore
{
    private WaveOutEvent outputDevice;
    private AudioFileReader audioFile;
    private Equalizer equalizer;
    
    public void Play(string url)
    {
        audioFile = new AudioFileReader(url);
        equalizer = new Equalizer(audioFile, 12);
        outputDevice = new WaveOutEvent();
        outputDevice.Init(equalizer);
        outputDevice.Play();
    }
}
```

##### Option C: miniaudio (C library)
- Легковесная, header-only библиотека
- Поддержка через Swift C interop
- Требует реализации EQ вручную

**Рекомендация:** BASS для Swift, NAudio для C#

---

### 4. **Services/DownloadService.swift** — Загрузка файлов

#### macOS:
```swift
class DownloadService {
    func download(url: URL) async throws -> URL {
        let (localURL, _) = try await URLSession.shared.download(from: url)
        return localURL
    }
}
```

**Портирование:**
- ✅ **Swift на Windows:** URLSession работает, код переносится напрямую
- ✅ **C#:** Используйте HttpClient с async/await

#### Windows (C#):
```csharp
public class DownloadService
{
    private readonly HttpClient _client = new();
    
    public async Task<string> Download(string url)
    {
        var response = await _client.GetAsync(url);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        var path = Path.Combine(CacheDirectory, GetCachedFilename(url));
        await File.WriteAllBytesAsync(path, bytes);
        return path;
    }
}
```

**Важно:**
- Используйте `%LOCALAPPDATA%\SuckFy\Cache` для кэша
- Реализуйте прогресс загрузки через IProgress<T>

---

### 5. **Services/EqualizerService.swift** — Эквалайзер

#### macOS (AVAudioUnitEQ):
```swift
let eq = AVAudioUnitEQ(numberOfBands: 12)
eq.bands[0].frequency = 60
eq.bands[0].bandwidth = 1.0
eq.bands[0].gain = -12...12
eq.bands[0].filterType = .parametric
```

#### Windows (BASS):
```swift
// BASS_FX_BFX_PEAKEQ
for i in 0..<12 {
    var params = BASS_BFX_PEAKEQ()
    params.fCenter = frequencies[i]
    params.fGain = gains[i]
    params.fBandwidth = 1.0
    BASS_FXSetParameters(eqHandles[i], &params)
}
```

**Частоты полос (из README):**
```swift
let frequencies: [Float] = [
    60, 150, 250, 500, 750, 1000, 1400, 2500, 3500, 4100, 8000, 16000
]
```

---

### 6. **Services/SpotifyService.swift & SoundCloudService.swift** — API интеграция

**Портирование:**
- ✅ Код сетевых запросов переносится 1:1 (URLSession/HttpClient)
- ✅ JSON парсинг работает аналогично (Codable/System.Text.Json)
- ⚠️ Проверьте URL схемы для OAuth редиректов

#### Используемые API:
1. **iTunes Search API**
   - Endpoint: `https://itunes.apple.com/search?term={query}&media=music`
   - Не требует ключа
   
2. **song.link / Odesli API**
   - Endpoint: `https://api.song.link/v1-alpha.1/links?url={spotifyUrl}`
   - Бесплатный, без ключа
   
3. **spotisaver.net**
   - Endpoint: `https://api.spotisaver.net/download?url={tidalUrl}`
   - Возвращает прямую ссылку на MP4 аудио

---

### 7. **Views/** — UI компоненты

#### SwiftUI → Windows UI

| SwiftUI Component | Windows Equivalent |
|-------------------|-------------------|
| `VStack` / `HStack` | `StackPanel` (WinUI) |
| `List` | `ListView` / `ItemsRepeater` |
| `Button` | `Button` |
| `Slider` | `Slider` |
| `Image` | `Image` |
| `@State` / `@StateObject` | MVVM + INotifyPropertyChanged |
| `@Published` | ObservableProperty (CommunityToolkit.Mvvm) |

#### Ключевые экраны для портирования:

1. **MainView.swift** — Главное окно
   - Sidebar + Content area
   - Windows: NavigationView + Frame

2. **PlayerControlsView.swift** — Плеер
   - Play/Pause, Next/Previous, Progress slider
   - Windows: Custom UserControl

3. **EqualizerView.swift** — Эквалайзер
   - 12 vertical sliders
   - Windows: Custom control с Canvas/CompositionAPI

4. **SearchView.swift** — Поиск
   - TextBox + ListView
   - Простая конверсия

**Рекомендации для UI:**
- Используйте MVVM pattern
- Binding для двустороннего обновления данных
- WinUI 3 Fluent Design для нативного вида

---

## 📦 Структура проекта (Windows + C#)

```
SuckFy.Windows/
├── SuckFy.App/              # WinUI 3 приложение
│   ├── App.xaml
│   ├── App.xaml.cs
│   ├── Views/
│   │   ├── MainWindow.xaml
│   │   ├── PlayerControlsView.xaml
│   │   ├── EqualizerView.xaml
│   │   └── SearchView.xaml
│   └── ViewModels/
│       ├── MainViewModel.cs
│       ├── PlayerViewModel.cs
│       └── EqualizerViewModel.cs
├── SuckFy.Core/             # Бизнес-логика (переиспользуемая)
│   ├── Models/
│   │   └── Track.cs
│   ├── Services/
│   │   ├── PlayerCore.cs
│   │   ├── DownloadService.cs
│   │   ├── EqualizerService.cs
│   │   ├── SpotifyService.cs
│   │   └── SoundCloudService.cs
│   └── Interfaces/
└── SuckFy.Tests/            # Unit tests
```

---

## 🔧 Пошаговый план портирования

### Фаза 1: Подготовка (1-2 дня)
1. ✅ Выбрать стратегию (Swift vs C#)
2. ✅ Настроить окружение разработки:
   - Visual Studio 2022 + WinUI 3 workload (для C#)
   - Swift for Windows toolchain (для Swift)
3. ✅ Изучить BASS Audio Library / NAudio
4. ✅ Создать новый проект

### Фаза 2: Ядро (3-5 дней)
1. ✅ Портировать **Track.swift** → Track.cs/swift
2. ✅ Портировать **DownloadService** с кэшированием
3. ✅ Реализовать **PlayerCore** с BASS/NAudio
   - Базовое воспроизведение (play/pause/stop)
   - Прогресс воспроизведения
   - Очередь треков
4. ✅ Протестировать воспроизведение локального файла

### Фаза 3: API интеграция (2-3 дня)
1. ✅ Портировать **SpotifyService**
2. ✅ Портировать **SoundCloudService**
3. ✅ Протестировать получение прямых URL треков
4. ✅ Интегрировать с PlayerCore

### Фаза 4: Эквалайзер (2-3 дня)
1. ✅ Реализовать **EqualizerService** с BASS_FX
2. ✅ Создать UI эквалайзера (12 слайдеров)
3. ✅ Реализовать пресеты (Bass Boost, Rock, Pop, Jazz)
4. ✅ Протестировать изменения в реальном времени

### Фаза 5: UI (5-7 дней)
1. ✅ Создать главное окно (MainWindow)
2. ✅ Реализовать Sidebar с навигацией
3. ✅ Создать экран поиска (SearchView)
4. ✅ Создать экран плеера (NowPlayingView)
5. ✅ Создать элементы управления (PlayerControlsView)
6. ✅ Добавить темную/светлую тему

### Фаза 6: Дополнительные функции (3-4 дня)
1. ✅ Реализовать "Избранные треки"
2. ✅ Реализовать плейлисты
3. ✅ Shuffle / Repeat режимы
4. ✅ System Tray интеграция (замена Menu Bar)

### Фаза 7: Полировка (2-3 дня)
1. ✅ Оптимизация производительности
2. ✅ Обработка ошибок
3. ✅ Логирование
4. ✅ Installer (MSIX package)

**Общее время:** ~3-4 недели при полной занятости

---

## 🚨 Критические точки внимания

### 1. **Аудио-движок — самая сложная часть**
- AVAudioEngine очень мощный, его аналог сложно реализовать
- BASS требует лицензии для коммерческого использования
- Тщательно тестируйте производительность EQ

### 2. **Пути файлов**
```swift
// macOS
~/Library/Caches/SuckFy/

// Windows
%LOCALAPPDATA%\SuckFy\Cache\
```

### 3. **API ограничения**
- iTunes API имеет rate limits
- Тестируйте с задержками между запросами
- Реализуйте retry логику

### 4. **Кодеки**
- Убедитесь, что выбранная аудио-библиотека поддерживает:
  - MP4 (AAC) — основной формат от spotisaver
  - MP3 — резервный
  - FLAC — опционально

---

## 📚 Полезные ресурсы

### Документация
- **BASS Audio:** https://www.un4seen.com/doc/
- **NAudio:** https://github.com/naudio/NAudio
- **WinUI 3:** https://learn.microsoft.com/en-us/windows/apps/winui/
- **Swift on Windows:** https://www.swift.org/download/#windows

### Примеры кода
- **NAudio Equalizer:** https://github.com/naudio/NAudio/blob/master/Docs/Equalizer.md
- **WinUI 3 Media Player:** https://github.com/microsoft/WinUI-Gallery

### Альтернативные библиотеки
- **PortAudio:** Кросс-платформенная, low-level
- **miniaudio:** Header-only, легковесная
- **CSCore:** C# альтернатива NAudio

---

## 🧪 Тестирование

### Unit тесты
```csharp
[TestClass]
public class PlayerCoreTests
{
    [TestMethod]
    public async Task Play_ValidUrl_StartsPlayback()
    {
        var player = new PlayerCore();
        var track = new Track { StreamURL = "http://..." };
        await player.Play(track);
        Assert.IsTrue(player.IsPlaying);
    }
}
```

### Интеграционные тесты
- Тестируйте реальные API вызовы
- Используйте реальные Spotify URL для валидации

### UI тесты
- WinAppDriver для автоматизации
- Ручное тестирование на разных разрешениях экрана

---

## 📝 Контрольный список

### Основной функционал
- [ ] Поиск треков через iTunes API
- [ ] Воспроизведение по Spotify URL
- [ ] Загрузка и кэширование
- [ ] 12-полосный эквалайзер
- [ ] Темная/светлая тема
- [ ] Избранные треки
- [ ] Плейлисты
- [ ] Shuffle/Repeat
- [ ] System Tray интеграция

### Производительность
- [ ] Воспроизведение без задержек
- [ ] EQ изменения в реальном времени
- [ ] Быстрая загрузка треков
- [ ] Минимальное использование памяти

### UX
- [ ] Интуитивный интерфейс
- [ ] Плавные анимации
- [ ] Правильная обработка ошибок
- [ ] Уведомления о статусе

---

## 🎯 Рекомендация для AI-агента

**Начните с Proof of Concept:**

1. Создайте минимальное WinUI 3 приложение
2. Интегрируйте BASS/NAudio
3. Воспроизведите один трек по прямой ссылке
4. Добавьте базовый UI (Play/Pause/Volume)

**Если POC успешен → продолжайте полное портирование**

**Приоритеты:**
1. Аудио-движок (критично)
2. API интеграция (критично)
3. Базовый UI (важно)
4. Эквалайзер (желательно)
5. Дополнительные функции (опционально)

---

## 💡 Альтернативный подход: Electron

Если нативное портирование слишком сложно:

```typescript
// TypeScript + Electron
import { BrowserWindow, app } from 'electron';
import { Howler } from 'howler'; // Аудио

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: { nodeIntegration: true }
  });
  win.loadFile('index.html');
});
```

**Преимущества:**
- Единый код для macOS + Windows
- React/Vue для UI
- Howler.js для аудио (поддерживает Web Audio API EQ)

**Недостатки:**
- Больший размер приложения
- Менее нативный вид

---

## 📞 Поддержка

При возникновении вопросов:
1. Изучите исходный macOS код в этом репозитории
2. Проверьте документацию выбранных библиотек
3. Создайте issue в GitHub репозитории

---

**Успехов в портировании! 🚀**

*Этот документ создан для упрощения процесса портирования SuckFy на Windows. Следуйте рекомендациям, но адаптируйте их под конкретные требования проекта.*
