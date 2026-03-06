import Foundation
import SwiftUI

// MARK: - Track Model

struct Track: Identifiable, Equatable, Hashable {
    let id: String          // Spotify track ID
    let title: String
    let artist: String
    let album: String
    let artworkURL: URL?
    let duration: TimeInterval

    // Playback
    var localURL: URL?      // Downloaded file path
    var isDownloaded: Bool { localURL != nil }
    var isDownloading: Bool = false

    static func == (lhs: Track, rhs: Track) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }

    var durationFormatted: String {
        let m = Int(duration) / 60
        let s = Int(duration) % 60
        return String(format: "%d:%02d", m, s)
    }

    var spotifyURL: URL? { URL(string: "https://open.spotify.com/track/\(id)") }

    // MARK: - Conversion from Spotify API response
    init(from spotify: SpotifyTrack) {
        self.id = spotify.id
        self.title = spotify.name
        self.artist = spotify.artistNames
        self.album = spotify.album.name
        self.artworkURL = spotify.artworkURL
        self.duration = spotify.duration
        self.localURL = nil
    }

    // MARK: - Direct init
    init(id: String, title: String, artist: String, album: String,
         artworkURL: URL?, duration: TimeInterval, localURL: URL? = nil) {
        self.id = id
        self.title = title
        self.artist = artist
        self.album = album
        self.artworkURL = artworkURL
        self.duration = duration
        self.localURL = localURL
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
