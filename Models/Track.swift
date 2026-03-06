import Foundation
import SwiftUI

// MARK: - Track Source

enum TrackSource: String, Codable {
    case spotify    // Downloaded via Tidal/song.link
    case soundCloud // Downloaded via yt-dlp + SC OAuth
    case itunes     // iTunes search result (downloaded via Tidal)

    var icon: String {
        switch self {
        case .spotify:    return "s.circle.fill"
        case .soundCloud: return "cloud.fill"
        case .itunes:     return "s.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .spotify:    return Color.green
        case .soundCloud: return Color.orange
        case .itunes:     return Color.green
        }
    }

    var label: String {
        switch self {
        case .spotify:    return "Spotify"
        case .soundCloud: return "SoundCloud"
        case .itunes:     return "Spotify"
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

struct Playlist: Identifiable {
    let id: String
    let name: String
    let description: String
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
}

// MARK: - Library Manager (persists liked songs & playlists)

@MainActor
class LibraryManager: ObservableObject {
    static let shared = LibraryManager()

    @Published var likedSongs: [Track] = []
    @Published var playlists: [Playlist] = []
    @Published var recentlyPlayed: [Track] = []

    private let likedKey = "dotify.likedSongs"
    private let recentKey = "dotify.recentlyPlayed"

    private init() { load() }

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
    }

    private func save() {
        if let data = try? JSONEncoder().encode(likedSongs.map(EncodableTrack.init)) {
            UserDefaults.standard.set(data, forKey: likedKey)
        }
        if let data = try? JSONEncoder().encode(recentlyPlayed.map(EncodableTrack.init)) {
            UserDefaults.standard.set(data, forKey: recentKey)
        }
    }

    private func load() {
        if let data = UserDefaults.standard.data(forKey: likedKey),
           let tracks = try? JSONDecoder().decode([EncodableTrack].self, from: data) {
            likedSongs = tracks.map(\.track)
        }
        if let data = UserDefaults.standard.data(forKey: recentKey),
           let tracks = try? JSONDecoder().decode([EncodableTrack].self, from: data) {
            recentlyPlayed = tracks.map(\.track)
        }
    }
}

// Codable wrapper for Track persistence
private struct EncodableTrack: Codable {
    let id, title, artist, album: String
    let artworkURLString: String?
    let duration: TimeInterval

    init(_ track: Track) {
        id = track.id; title = track.title; artist = track.artist
        album = track.album; duration = track.duration
        artworkURLString = track.artworkURL?.absoluteString
    }

    var track: Track {
        Track(id: id, title: title, artist: artist, album: album,
              artworkURL: artworkURLString.flatMap(URL.init), duration: duration)
    }
}
