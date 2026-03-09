# 🔧 Исправления для iOS версии

## 1️⃣ Исправление сетевых запросов (Spotify поиск)

iOS блокирует HTTP запросы по умолчанию. Нужно добавить исключение:

### В Xcode:
1. Откройте `Info.plist` в проекте
2. Добавьте следующий ключ:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

### Или через UI Xcode:
1. Выберите Info.plist
2. Нажмите + для добавления строки
3. Key: `App Transport Security Settings`
4. Раскройте стрелку
5. Добавьте: `Allow Arbitrary Loads` = `YES`

---

## 2️⃣ Исправление UI (нижнее меню)

Проблема: PlayerControls выходит за рамки экрана.

Нужно добавить `.safeAreaInset` для TabView на iOS.

### Исправление в MainView.swift:

Найдите iOS layout и добавьте `.safeAreaInset`:

```swift
TabView(selection: $selectedItem) {
    // ... вкладки
}
.safeAreaInset(edge: .bottom) {
    PlayerControlsView()
        .background(.ultraThinMaterial)
}
```

И уберите PlayerControlsView из VStack снаружи TabView.

---

## 3️⃣ Дополнительные улучшения

### Скрыть EqualizerView на iOS
В Sidebar или Settings, добавьте условие:
```swift
#if os(macOS)
NavigationLink("Equalizer") { EqualizerView() }
#endif
```

### Адаптировать размеры для iPhone
- Уменьшить artwork размеры
- Адаптировать шрифты
- Использовать `.minimumScaleFactor()` для текста
