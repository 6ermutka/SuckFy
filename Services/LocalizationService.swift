import Foundation
import SwiftUI

class LocalizationService: ObservableObject {
    static let shared = LocalizationService()
    
    @Published var currentLanguage: String {
        didSet {
            UserDefaults.standard.set(currentLanguage, forKey: "appLanguage")
        }
    }
    
    private init() {
        self.currentLanguage = UserDefaults.standard.string(forKey: "appLanguage") ?? "en"
    }
    
    func translate(_ key: String) -> String {
        translations[currentLanguage]?[key] ?? key
    }
    
    private let translations: [String: [String: String]] = [
        "en": [
            // Sidebar
            "Home": "Home",
            "Search": "Search",
            "Library": "Library",
            "Liked Songs": "Liked Songs",
            "Settings": "Settings",
            "Create Playlist": "Create Playlist",
            "PLAYLISTS": "PLAYLISTS",
            
            // Library View
            "MY LIBRARY": "MY LIBRARY",
            "Downloaded Tracks": "Downloaded Tracks",
            "tracks": "tracks",
            "Select": "Select",
            "Done": "Done",
            "Search in library...": "Search in library...",
            "All": "All",
            "Spotify": "Spotify",
            "SoundCloud": "SoundCloud",
            "Import": "Import",
            "Shuffle": "Shuffle",
            "Play": "Play",
            "Delete": "Delete",
            "Delete %d track": "Delete %d track",
            "Delete %d tracks": "Delete %d tracks",
            "No downloaded tracks": "No downloaded tracks",
            "Play any track to download it automatically": "Play any track to download it automatically",
            "No tracks found": "No tracks found",
            "Try a different search term": "Try a different search term",
            "Delete Track": "Delete Track",
            "Are you sure you want to delete '%@' from your device?": "Are you sure you want to delete '%@' from your device?",
            "Cancel": "Cancel",
            "Are you sure you want to delete %d track(s) from your device?": "Are you sure you want to delete %d track(s) from your device?",
            
            // Liked Songs
            "PLAYLIST": "PLAYLIST",
            "songs": "songs",
            "song": "song",
            "No liked songs yet": "No liked songs yet",
            "Tap ♥ on any track to save it here": "Tap ♥ on any track to save it here",
            
            // Search
            "Search for tracks": "Search for tracks",
            "Paste Spotify or SoundCloud track link...": "Paste Spotify or SoundCloud track link...",
            "Search for music to get started": "Search for music to get started",
            "Use the Search tab to find Spotify tracks": "Use the Search tab to find Spotify tracks",
            "No results": "No results",
            "Try a different search": "Try a different search",
            
            // Home
            "Good morning": "Good morning",
            "Good afternoon": "Good afternoon",
            "Good evening": "Good evening",
            "Recently Played": "Recently Played",
            
            // Settings
            "Storage": "Storage",
            "Cache Location": "Cache Location",
            "Change": "Change",
            "Cache Size": "Cache Size",
            "Clear Cache": "Clear Cache",
            "Import Local Tracks": "Import Local Tracks",
            "Add MP3, M4A, FLAC files from your computer": "Add MP3, M4A, FLAC files from your computer",
            "Language": "Language",
            "English": "English",
            "Russian": "Русский",
            
            // Playlist
            "Edit Playlist": "Edit Playlist",
            "Name": "Name",
            "Description": "Description",
            "Playlist Name": "Playlist Name",
            "My Playlist": "My Playlist",
            "Description (optional)": "Description (optional)",
            "Add a description...": "Add a description...",
            "Create": "Create",
            "Save": "Save",
            "Change Artwork": "Change Artwork",
            "No tracks in this playlist": "No tracks in this playlist",
            "Search for songs and add them to this playlist": "Search for songs and add them to this playlist",
            "Remove from Playlist": "Remove from Playlist",
            "Add to Playlist": "Add to Playlist",
            
            // Theme
            "Dark": "Dark",
            "Light": "Light",
            
            // Player
            "Local File": "Local File",
            "Unknown Track": "Unknown Track",
            "Unknown Artist": "Unknown Artist"
        ],
        "ru": [
            // Sidebar
            "Home": "Главная",
            "Search": "Поиск",
            "Library": "Библиотека",
            "Liked Songs": "Любимые треки",
            "Settings": "Настройки",
            "Create Playlist": "Создать плейлист",
            "PLAYLISTS": "ПЛЕЙЛИСТЫ",
            
            // Library View
            "MY LIBRARY": "МОЯ БИБЛИОТЕКА",
            "Downloaded Tracks": "Скачанные треки",
            "tracks": "треков",
            "Select": "Выбрать",
            "Done": "Готово",
            "Search in library...": "Поиск в библиотеке...",
            "All": "Все",
            "Spotify": "Spotify",
            "SoundCloud": "SoundCloud",
            "Import": "Импорт",
            "Shuffle": "Перемешать",
            "Play": "Воспроизвести",
            "Delete": "Удалить",
            "Delete %d track": "Удалить %d трек",
            "Delete %d tracks": "Удалить %d треков",
            "No downloaded tracks": "Нет скачанных треков",
            "Play any track to download it automatically": "Воспроизведите любой трек для автоматической загрузки",
            "No tracks found": "Треки не найдены",
            "Try a different search term": "Попробуйте другой запрос",
            "Delete Track": "Удалить трек",
            "Are you sure you want to delete '%@' from your device?": "Вы уверены, что хотите удалить '%@' с вашего устройства?",
            "Cancel": "Отмена",
            "Are you sure you want to delete %d track(s) from your device?": "Вы уверены, что хотите удалить %d трек(ов) с вашего устройства?",
            
            // Liked Songs
            "PLAYLIST": "ПЛЕЙЛИСТ",
            "songs": "песен",
            "song": "песня",
            "No liked songs yet": "Пока нет любимых треков",
            "Tap ♥ on any track to save it here": "Нажмите ♥ на любом треке, чтобы сохранить его здесь",
            
            // Search
            "Search for tracks": "Поиск треков",
            "Paste Spotify or SoundCloud track link...": "Вставьте ссылку на трек Spotify или SoundCloud...",
            "Search for music to get started": "Найдите музыку для начала",
            "Use the Search tab to find Spotify tracks": "Используйте вкладку Поиск для поиска треков Spotify",
            "No results": "Нет результатов",
            "Try a different search": "Попробуйте другой запрос",
            
            // Home
            "Good morning": "Доброе утро",
            "Good afternoon": "Добрый день",
            "Good evening": "Добрый вечер",
            "Recently Played": "Недавно прослушанные",
            
            // Settings
            "Storage": "Хранилище",
            "Cache Location": "Расположение кэша",
            "Change": "Изменить",
            "Cache Size": "Размер кэша",
            "Clear Cache": "Очистить кэш",
            "Import Local Tracks": "Импорт локальных треков",
            "Add MP3, M4A, FLAC files from your computer": "Добавьте MP3, M4A, FLAC файлы с вашего компьютера",
            "Language": "Язык",
            "English": "English",
            "Russian": "Русский",
            
            // Playlist
            "Edit Playlist": "Редактировать плейлист",
            "Name": "Название",
            "Description": "Описание",
            "Playlist Name": "Название плейлиста",
            "My Playlist": "Мой плейлист",
            "Description (optional)": "Описание (опционально)",
            "Add a description...": "Добавьте описание...",
            "Create": "Создать",
            "Save": "Сохранить",
            "Change Artwork": "Изменить обложку",
            "No tracks in this playlist": "В плейлисте нет треков",
            "Search for songs and add them to this playlist": "Найдите песни и добавьте их в этот плейлист",
            "Remove from Playlist": "Удалить из плейлиста",
            "Add to Playlist": "Добавить в плейлист",
            
            // Theme
            "Dark": "Тёмная",
            "Light": "Светлая",
            
            // Player
            "Local File": "Локальный файл",
            "Unknown Track": "Неизвестный трек",
            "Unknown Artist": "Неизвестный исполнитель"
        ]
    ]
}

// SwiftUI Environment Key
struct LocalizationServiceKey: EnvironmentKey {
    static let defaultValue = LocalizationService.shared
}

extension EnvironmentValues {
    var localization: LocalizationService {
        get { self[LocalizationServiceKey.self] }
        set { self[LocalizationServiceKey.self] = newValue }
    }
}

// Helper function for easy access
func tr(_ key: String) -> String {
    LocalizationService.shared.translate(key)
}

// View Extension for easy localization
extension View {
    func localized() -> some View {
        self.environment(\.localization, LocalizationService.shared)
    }
}

// Text Extension for easy translation
extension Text {
    init(_ key: String, localized: Bool = true) {
        if localized {
            self.init(verbatim: tr(key))
        } else {
            self.init(verbatim: key)
        }
    }
}
