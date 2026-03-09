import Foundation
import SwiftUI
import Combine

// MARK: - Track Source

enum TrackSource: String, Codable {
    case spotify    // Downloaded via Tidal/song.link
    case soundCloud // Downloaded via yt-dlp + SC OAuth
    case itunes     // iTunes search result (downloaded via Tidal)
    case imported   // Imported local files

    var icon: String {
        switch self {
        case .spotify:    return "s.circle.fill"
        case .soundCloud: return "cloud.fill"
        case .itunes:     return "s.circle.fill"
        case .imported:   return "arrow.down.doc.fill"
        }
    }

    var color: Color {
        switch self {
        case .spotify:    return Color.green
        case .soundCloud: return Color.orange
        case .itunes:     return Color.green
        case .imported:   return Color.purple
        }
    }

    var label: String {
        switch self {
        case .spotify:    return "Spotify"
        case .soundCloud: return "SoundCloud"
        case .itunes:     return "Spotify"
        case .imported:   return "Import"
        }
    }
}

// MARK: - Track Model

struct Track: Identifiable, Equatable, Hashable {
    let id: String
    let title: String
    let artist: String
    let album: String
    let artworkURL: URL?
    let duration: TimeInterval
    var source: TrackSource = .spotify

    // Playback
    var localURL: URL?
    var isDownloaded: Bool { localURL != nil }
    var isDownloading: Bool = false
    
    // Mutating method to update source
    mutating func updateSource() {
        if id.hasPrefix("sc:") {
            source = .soundCloud
        } else if id.hasPrefix("itunes:") {
            source = .itunes
        } else {
            source = .spotify
        }
    }

    static func == (lhs: Track, rhs: Track) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }

    var durationFormatted: String {
        let m = Int(duration) / 60
        let s = Int(duration) % 60
        return String(format: "%d:%02d", m, s)
    }

    var isSoundCloud: Bool { id.hasPrefix("sc:") }
    var isSpotify: Bool { !isSoundCloud && !id.hasPrefix("itunes:") }
    var soundCloudID: String? { isSoundCloud ? String(id.dropFirst(3)) : nil }

    var spotifyURL: URL? {
        guard isSpotify else { return nil }
        return URL(string: "https://open.spotify.com/track/\(id)")
    }

    var soundCloudURL: URL? {
        guard isSoundCloud else { return nil }
        return nil // stored in webURL via SCTrack
    }

    // MARK: - Conversion from Spotify API response
    init(from spotify: SpotifyTrack) {
        self.id = spotify.id
        self.title = spotify.name
        self.artist = spotify.artistNames
        self.album = spotify.album.name
        self.artworkURL = spotify.artworkURL
        self.duration = spotify.duration
        self.source = spotify.id.hasPrefix("itunes:") ? .itunes : .spotify
        self.localURL = nil
    }

    // MARK: - Direct init
    init(id: String, title: String, artist: String, album: String,
         artworkURL: URL?, duration: TimeInterval, localURL: URL? = nil,
         source: TrackSource = .spotify) {
        self.id = id
        self.title = title
        self.artist = artist
        self.album = album
        self.artworkURL = artworkURL
        self.duration = duration
        self.localURL = localURL
        self.source = source
    }
}

// MARK: - Playlist Model

struct Playlist: Identifiable, Equatable, Hashable {
    let id: String
    var name: String
    var description: String
    let artworkURL: URL?
    var tracks: [Track]

    init(id: String, name: String, description: String, artworkURL: URL?, tracks: [Track]) {
        self.id = id
        self.name = name
        self.description = description
        self.artworkURL = artworkURL
        self.tracks = tracks
    }

    var totalDuration: TimeInterval { tracks.reduce(0) { $0 + $1.duration } }
    var totalDurationFormatted: String {
        let m = Int(totalDuration) / 60
        let s = Int(totalDuration) % 60
        return String(format: "%d:%02d", m, s)
    }
    
    static func == (lhs: Playlist, rhs: Playlist) -> Bool {
        lhs.id == rhs.id
    }
    
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - Library Manager (persists liked songs & playlists)

@MainActor
class LibraryManager: ObservableObject {
    static let shared = LibraryManager()

    @Published var likedSongs: [Track] = []
    @Published var playlists: [Playlist] = []
    @Published var recentlyPlayed: [Track] = []
    @Published var downloadedTracks: [Track] = []

    private let likedKey = "dotify.likedSongs"
    private let recentKey = "dotify.recentlyPlayed"
    private let playlistsKey = "dotify.playlists"
    
    // Use standard UserDefaults for data persistence
    private let defaults = UserDefaults.standard

    private init() { 
        load()
        loadDownloadedTracks()
    }

    func isLiked(_ track: Track) -> Bool { likedSongs.contains(where: { $0.id == track.id }) }

    func toggleLike(_ track: Track) {
        if let idx = likedSongs.firstIndex(where: { $0.id == track.id }) {
            likedSongs.remove(at: idx)
        } else {
            likedSongs.insert(track, at: 0)
        }
        save()
    }

    func addToRecent(_ track: Track) {
        recentlyPlayed.removeAll { $0.id == track.id }
        recentlyPlayed.insert(track, at: 0)
        if recentlyPlayed.count > 30 { recentlyPlayed = Array(recentlyPlayed.prefix(30)) }
        save()
    }

    func addPlaylist(_ playlist: Playlist) {
        playlists.append(playlist)
        save()
    }
    
    func removePlaylist(_ playlist: Playlist) {
        playlists.removeAll { $0.id == playlist.id }
        save()
    }
    
    func addTrackToPlaylist(_ track: Track, playlistID: String) {
        guard let index = playlists.firstIndex(where: { $0.id == playlistID }) else { return }
        if !playlists[index].tracks.contains(where: { $0.id == track.id }) {
            playlists[index].tracks.append(track)
            save()
        }
    }
    
    func removeTrackFromPlaylist(_ track: Track, playlistID: String) {
        guard let index = playlists.firstIndex(where: { $0.id == playlistID }) else { return }
        playlists[index].tracks.removeAll { $0.id == track.id }
        save()
    }
    
    func updatePlaylist(_ playlistID: String, name: String, description: String) {
        guard let index = playlists.firstIndex(where: { $0.id == playlistID }) else { return }
        playlists[index].name = name
        playlists[index].description = description
        save()
    }

    private func save() {
        if let data = try? JSONEncoder().encode(likedSongs.map(EncodableTrack.init)) {
            defaults.set(data, forKey: likedKey)
        }
        if let data = try? JSONEncoder().encode(recentlyPlayed.map(EncodableTrack.init)) {
            defaults.set(data, forKey: recentKey)
        }
        if let data = try? JSONEncoder().encode(playlists.map(EncodablePlaylist.init)) {
            defaults.set(data, forKey: playlistsKey)
        }
        defaults.synchronize()
    }

    private func load() {
        if let data = defaults.data(forKey: likedKey),
           let tracks = try? JSONDecoder().decode([EncodableTrack].self, from: data) {
            likedSongs = tracks.map(\.track)
        }
        if let data = defaults.data(forKey: recentKey),
           let tracks = try? JSONDecoder().decode([EncodableTrack].self, from: data) {
            recentlyPlayed = tracks.map(\.track)
        }
        if let data = defaults.data(forKey: playlistsKey),
           let encodedPlaylists = try? JSONDecoder().decode([EncodablePlaylist].self, from: data) {
            playlists = encodedPlaylists.map(\.playlist)
        }
    }
    
    // MARK: - Downloaded Tracks Management
    
    func loadDownloadedTracks() {
        Task {
            let cachedIDs = await DownloadService.shared.getAllCachedTracks()
            
            // Match cached files with tracks from recent/liked/playlists
            var tracks: [Track] = []
            
            for trackID in cachedIDs {
                // Determine source from ID
                let source: TrackSource
                var isImported = false
                
                if trackID.hasPrefix("sc:") {
                    source = .soundCloud
                } else if trackID.hasPrefix("itunes:") {
                    source = .itunes
                } else {
                    // Check if it's an imported file (UUID format without metadata)
                    let localURL = await DownloadService.shared.cacheFile(for: trackID)
                    if FileManager.default.fileExists(atPath: localURL.path) {
                        // If we can't find it in library, it's imported
                        if findTrack(byID: trackID) == nil {
                            source = .imported
                            isImported = true
                        } else {
                            source = .spotify
                        }
                    } else {
                        source = .spotify
                    }
                }
                
                // Try to find track in existing data
                if let track = findTrack(byID: trackID) {
                    var updatedTrack = track
                    updatedTrack.localURL = await DownloadService.shared.cacheFile(for: trackID)
                    updatedTrack.source = source
                    tracks.append(updatedTrack)
                } else {
                    // Track not found in library - might be imported
                    let localURL = await DownloadService.shared.cacheFile(for: trackID)
                    
                    // For imported files, try to get filename as title
                    var title = "Unknown Track"
                    if isImported || source == .imported {
                        // Get the original filename from cache
                        let filename = localURL.deletingPathExtension().lastPathComponent
                        // If it's not a UUID, use it as title
                        if filename != trackID {
                            title = filename
                        } else {
                            // Try to find any file with this trackID in cache
                            let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
                                .appendingPathComponent("Dotify")
                            if let files = try? FileManager.default.contentsOfDirectory(at: cacheDir, includingPropertiesForKeys: nil) {
                                for file in files {
                                    if file.lastPathComponent.hasPrefix(trackID) {
                                        title = file.deletingPathExtension().lastPathComponent
                                        break
                                    }
                                }
                            }
                        }
                    }
                    
                    let track = Track(
                        id: trackID,
                        title: title,
                        artist: source == .imported ? "Local File" : "Unknown Artist",
                        album: "",
                        artworkURL: nil,
                        duration: 0,
                        localURL: localURL,
                        source: source
                    )
                    tracks.append(track)
                }
            }
            
            await MainActor.run {
                self.downloadedTracks = tracks.sorted { $0.title < $1.title }
            }
        }
    }
    
    func deleteDownloadedTrack(_ track: Track) {
        Task {
            do {
                try await DownloadService.shared.deleteCachedTrack(track.id)
                await MainActor.run {
                    downloadedTracks.removeAll { $0.id == track.id }
                }
            } catch {
                print("Failed to delete track: \(error)")
            }
        }
    }
    
    func getDownloadedTrackSize(_ track: Track) -> String {
        Task {
            let size = await DownloadService.shared.getCachedFileSize(track.id)
            return formatFileSize(size)
        }
        return "..."
    }
    
    private func formatFileSize(_ bytes: Int64) -> String {
        let mb = Double(bytes) / 1_048_576
        return String(format: "%.1f MB", mb)
    }
    
    private func findTrack(byID id: String) -> Track? {
        // Search in recent
        if let track = recentlyPlayed.first(where: { $0.id == id }) {
            return track
        }
        // Search in liked
        if let track = likedSongs.first(where: { $0.id == id }) {
            return track
        }
        // Search in playlists
        for playlist in playlists {
            if let track = playlist.tracks.first(where: { $0.id == id }) {
                return track
            }
        }
        return nil
    }
}

// Codable wrapper for Track persistence
private struct EncodableTrack: Codable {
    let id, title, artist, album: String
    let artworkURLString: String?
    let duration: TimeInterval
    let source: TrackSource

    init(_ track: Track) {
        id = track.id; title = track.title; artist = track.artist
        album = track.album; duration = track.duration
        artworkURLString = track.artworkURL?.absoluteString
        source = track.source
    }

    var track: Track {
        Track(id: id, title: title, artist: artist, album: album,
              artworkURL: artworkURLString.flatMap(URL.init), duration: duration,
              source: source)
    }
}

// Codable wrapper for Playlist persistence
private struct EncodablePlaylist: Codable {
    let id, name, description: String
    let artworkURLString: String?
    let tracks: [EncodableTrack]
    
    init(_ playlist: Playlist) {
        id = playlist.id
        name = playlist.name
        description = playlist.description
        artworkURLString = playlist.artworkURL?.absoluteString
        tracks = playlist.tracks.map(EncodableTrack.init)
    }
    
    var playlist: Playlist {
        Playlist(
            id: id,
            name: name,
            description: description,
            artworkURL: artworkURLString.flatMap(URL.init),
            tracks: tracks.map(\.track)
        )
    }
}
