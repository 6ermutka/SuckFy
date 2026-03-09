import Foundation
import CommonCrypto

// MARK: - Music Search Service
// Uses iTunes Search API for track search (free, no auth, no rate limits)
// Uses Spotify Web API with TOTP for playlist/track import by URL

actor SpotifyService {

    static let shared = SpotifyService()
    private let session: URLSession
    private let userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"
    
    // Token cache
    private var cachedToken: String?
    private var tokenExpiry: Date?
    private var lastRequestTime: Date?

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 20
        self.session = URLSession(configuration: config)
    }

    // MARK: - Search via iTunes API

    func search(query: String, limit: Int = 25) async throws -> [SpotifyTrack] {
        print("🔍 [SEARCH] Starting search for: '\(query)'")
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        let urlString = "https://itunes.apple.com/search?term=\(encoded)&media=music&entity=song&limit=\(limit)"
        print("🔍 [SEARCH] URL: \(urlString)")
        
        guard let url = URL(string: urlString) else {
            print("❌ [SEARCH] Invalid URL")
            throw SearchError.invalidURL
        }
        
        do {
            print("🔍 [SEARCH] Making request...")
            let (data, response) = try await session.data(from: url)
            
            if let httpResponse = response as? HTTPURLResponse {
                print("🔍 [SEARCH] Response status: \(httpResponse.statusCode)")
            }
            
            print("🔍 [SEARCH] Received \(data.count) bytes")
            let result = try JSONDecoder().decode(iTunesSearchResponse.self, from: data)
            print("✅ [SEARCH] Found \(result.results.count) tracks")
            return result.results.map { SpotifyTrack(from: $0) }
        } catch {
            print("❌ [SEARCH] Error: \(error)")
            print("❌ [SEARCH] Error type: \(type(of: error))")
            if let urlError = error as? URLError {
                print("❌ [SEARCH] URLError code: \(urlError.code.rawValue)")
            }
            throw error
        }
    }

    // MARK: - Get Spotify track by ID (for import via URL)
    // Uses Spotify Web API with anonymous TOTP token

    func track(id: String) async throws -> SpotifyTrack {
        let token = try await getSpotifyToken()
        let url = URL(string: "https://api.spotify.com/v1/tracks/\(id)")!
        var req = URLRequest(url: url)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        let (data, resp) = try await session.data(for: req)
        if let r = resp as? HTTPURLResponse, r.statusCode == 429 {
            throw SearchError.rateLimited
        }
        return try JSONDecoder().decode(SpotifyTrack.self, from: data)
    }

    // MARK: - Get Spotify playlist by ID

    func playlist(id: String) async throws -> SpotifyPlaylist {
        let token = try await getSpotifyToken()
        var components = URLComponents(string: "https://api.spotify.com/v1/playlists/\(id)")!
        components.queryItems = [
            .init(name: "fields", value: "id,name,description,images,tracks.items(track(id,name,duration_ms,artists,album))")
        ]
        var req = URLRequest(url: components.url!)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        let (data, resp) = try await session.data(for: req)
        if let r = resp as? HTTPURLResponse, r.statusCode == 429 {
            throw SearchError.rateLimited
        }
        return try JSONDecoder().decode(SpotifyPlaylist.self, from: data)
    }
    
    // MARK: - Get Spotify album by ID
    
    func album(id: String) async throws -> SpotifyAlbumFull {
        let token = try await getSpotifyToken()
        let url = URL(string: "https://api.spotify.com/v1/albums/\(id)")!
        var req = URLRequest(url: url)
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        let (data, resp) = try await session.data(for: req)
        if let r = resp as? HTTPURLResponse, r.statusCode == 429 {
            throw SearchError.rateLimited
        }
        return try JSONDecoder().decode(SpotifyAlbumFull.self, from: data)
    }

    // MARK: - Spotify TOTP Token (for import only)

    private func getSpotifyToken() async throws -> String {
        // Check if we have a valid cached token
        if let token = cachedToken,
           let expiry = tokenExpiry,
           expiry > Date() {
            return token
        }
        
        // Rate limiting: wait at least 1 second between token requests
        if let lastRequest = lastRequestTime {
            let elapsed = Date().timeIntervalSince(lastRequest)
            if elapsed < 1.0 {
                try await Task.sleep(for: .milliseconds(Int((1.0 - elapsed) * 1000)))
            }
        }
        
        let totp = generateTOTP()
        var components = URLComponents(string: "https://open.spotify.com/api/token")!
        components.queryItems = [
            .init(name: "reason", value: "init"),
            .init(name: "productType", value: "web-player"),
            .init(name: "totp", value: totp),
            .init(name: "totpVer", value: "61"),
            .init(name: "totpServer", value: totp)
        ]
        var req = URLRequest(url: components.url!)
        req.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        req.setValue("https://open.spotify.com", forHTTPHeaderField: "Referer")
        
        lastRequestTime = Date()
        
        let (data, _) = try await session.data(for: req)
        let json = try JSONDecoder().decode(SpotifyTokenResponse.self, from: data)
        
        // Cache token for 30 minutes
        cachedToken = json.accessToken
        tokenExpiry = Date().addingTimeInterval(30 * 60)
        
        return json.accessToken
    }

    private func generateTOTP() -> String {
        let secret = "GM3TMMJTGYZTQNZVGM4DINJZHA4TGOBYGMZTCMRTGEYDSMJRHE4TEOBUG4YTCMRUGQ4DQOJUGQYTAMRRGA2TCMJSHE3TCMBY"
        guard let key = base32Decode(secret) else { return "000000" }
        let t = UInt64(Date().timeIntervalSince1970) / 30
        var bigT = t.bigEndian
        let msg = Data(bytes: &bigT, count: 8)
        var h = [UInt8](repeating: 0, count: 20)
        key.withUnsafeBytes { keyPtr in
            msg.withUnsafeBytes { msgPtr in
                CCHmac(CCHmacAlgorithm(kCCHmacAlgSHA1),
                       keyPtr.baseAddress, key.count,
                       msgPtr.baseAddress, msg.count,
                       &h)
            }
        }
        let offset = Int(h[19] & 0x0F)
        let code = (Int(h[offset] & 0x7F) << 24 | Int(h[offset+1]) << 16 | Int(h[offset+2]) << 8 | Int(h[offset+3])) % 1_000_000
        return String(format: "%06d", code)
    }

    private func base32Decode(_ s: String) -> Data? {
        let alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
        var bits = 0, val = 0
        var out = Data()
        for c in s.uppercased() {
            guard let i = alpha.firstIndex(of: c) else { continue }
            val = (val << 5) | alpha.distance(from: alpha.startIndex, to: i)
            bits += 5
            if bits >= 8 { out.append(UInt8((val >> (bits - 8)) & 0xFF)); bits -= 8 }
        }
        return out
    }
}

// MARK: - iTunes Search Models

private struct iTunesSearchResponse: Decodable {
    let resultCount: Int
    let results: [iTunesTrack]
}

struct iTunesTrack: Decodable {
    let trackId: Int
    let trackName: String
    let artistName: String
    let collectionName: String
    let artworkUrl100: String?
    let trackTimeMillis: Int?
    let previewUrl: String?
}

// MARK: - Unified SpotifyTrack model (used by both iTunes and Spotify API)

struct SpotifyTrack: Decodable, Identifiable {
    let id: String
    let name: String
    let durationMs: Int
    let artists: [SpotifyArtist]
    let album: SpotifyAlbum
    var previewUrl: String?

    var artistNames: String { artists.map(\.name).joined(separator: ", ") }
    var duration: TimeInterval { TimeInterval(durationMs) / 1000 }
    var artworkURL: URL? { album.images.first.flatMap { URL(string: $0.url) } }
    var spotifyURL: String { "https://open.spotify.com/track/\(id)" }

    enum CodingKeys: String, CodingKey {
        case id, name, artists, album
        case durationMs = "duration_ms"
        case previewUrl = "preview_url"
    }

    // Init from iTunes result
    // id = "itunes:<trackId>" — при скачивании используем title+artist для поиска через song.link
    init(from itunes: iTunesTrack) {
        self.id = "itunes:\(itunes.trackId)"
        self.name = itunes.trackName
        self.durationMs = itunes.trackTimeMillis ?? 0
        self.artists = [SpotifyArtist(id: "", name: itunes.artistName)]
        self.album = SpotifyAlbum(
            id: "",
            name: itunes.collectionName,
            images: itunes.artworkUrl100.map { url in
                let bigUrl = url.replacingOccurrences(of: "100x100bb", with: "600x600bb")
                return [SpotifyImage(url: bigUrl, width: 600, height: 600)]
            } ?? []
        )
        self.previewUrl = itunes.previewUrl
    }

    // Helpers
    var isItunesTrack: Bool { id.hasPrefix("itunes:") }
    var itunesTrackId: String { String(id.dropFirst("itunes:".count)) }
}

struct SpotifyArtist: Decodable {
    let id: String
    let name: String
}

struct SpotifyAlbum: Decodable {
    let id: String
    let name: String
    let images: [SpotifyImage]
    var releaseDate: String?
    enum CodingKeys: String, CodingKey {
        case id, name, images
        case releaseDate = "release_date"
    }
}

struct SpotifyImage: Decodable {
    let url: String
    let width: Int?
    let height: Int?
}

struct SpotifyPlaylist: Decodable {
    let id: String
    let name: String
    let description: String?
    let images: [SpotifyImage]
    let tracks: SpotifyPlaylistTracks
}

struct SpotifyPlaylistTracks: Decodable {
    let items: [SpotifyPlaylistItem]
}

struct SpotifyPlaylistItem: Decodable {
    let track: SpotifyTrack?
}

struct SpotifyAlbumFull: Decodable {
    let id: String
    let name: String
    let artists: [SpotifyArtist]
    let images: [SpotifyImage]
    let releaseDate: String?
    let tracks: SpotifyAlbumTracks
    
    enum CodingKeys: String, CodingKey {
        case id, name, artists, images, tracks
        case releaseDate = "release_date"
    }
}

struct SpotifyAlbumTracks: Decodable {
    let items: [SpotifyAlbumTrack]
}

struct SpotifyAlbumTrack: Decodable {
    let id: String
    let name: String
    let durationMs: Int
    let artists: [SpotifyArtist]
    
    enum CodingKeys: String, CodingKey {
        case id, name, artists
        case durationMs = "duration_ms"
    }
}

struct SpotifyTokenResponse: Decodable {
    let accessToken: String
}

enum SearchError: LocalizedError {
    case rateLimited
    case invalidURL
    
    var errorDescription: String? {
        switch self {
        case .rateLimited:
            return "Search rate limited. Please try again in a moment."
        case .invalidURL:
            return "Invalid URL"
        }
    }
}
