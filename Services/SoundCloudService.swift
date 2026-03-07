import Foundation
import Security

// MARK: - SoundCloud Service
// Uses yt-dlp with OAuth token for full track downloads

@MainActor
class SoundCloudService: ObservableObject {
    static let shared = SoundCloudService()

    @Published var authToken: String = ""
    @Published var isAuthenticated: Bool = false
    @Published var username: String = ""

    private let keychainKey = "suckfy.soundcloud.oauth"
    private let ytdlpPath: String

    private init() {
        // Find yt-dlp
        if FileManager.default.fileExists(atPath: "/usr/local/bin/yt-dlp") {
            ytdlpPath = "/usr/local/bin/yt-dlp"
        } else if FileManager.default.fileExists(atPath: "/opt/homebrew/bin/yt-dlp") {
            ytdlpPath = "/opt/homebrew/bin/yt-dlp"
        } else {
            ytdlpPath = "yt-dlp"
        }
        loadToken()
    }

    // MARK: - Auth Token Management

    // Cookie string from browser session
    var cookieString: String { authToken }

    func saveToken(_ token: String, username: String = "") async {
        authToken = token
        isAuthenticated = !token.isEmpty
        
        // Fetch username from API if not provided
        var finalUsername = username
        if !token.isEmpty && username.isEmpty {
            finalUsername = await fetchUsername(token: token) ?? "SoundCloud User"
        }
        
        self.username = finalUsername

        // Save token to Keychain
        let data = token.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: keychainKey,
            kSecValueData as String: data
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
        UserDefaults.standard.set(finalUsername, forKey: "suckfy.soundcloud.username")
        
        print("[SuckFy] SoundCloud token saved: \(token.prefix(20))... for user: \(finalUsername)")
    }
    
    // Fetch username from SoundCloud API
    private func fetchUsername(token: String) async -> String? {
        do {
            let url = URL(string: "https://api-v2.soundcloud.com/me")!
            var request = URLRequest(url: url)
            request.setValue("OAuth \(token)", forHTTPHeaderField: "Authorization")
            request.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", forHTTPHeaderField: "User-Agent")
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                print("[SuckFy] Failed to fetch SoundCloud user info")
                return nil
            }
            
            if let json = try? JSONDecoder().decode(SCAPIUser.self, from: data) {
                print("[SuckFy] Fetched SoundCloud username: \(json.username)")
                return json.username
            }
        } catch {
            print("[SuckFy] Error fetching SoundCloud username: \(error)")
        }
        return nil
    }

    // Save cookies from WKWebView as Netscape cookie file for yt-dlp
    func saveCookies(_ cookies: [HTTPCookie]) async {
        var lines = ["# Netscape HTTP Cookie File"]
        for c in cookies {
            guard c.domain.contains("soundcloud") else { continue }
            let domain = c.domain.hasPrefix(".") ? c.domain : ".\(c.domain)"
            let includeSubdomains = "TRUE"
            let path = c.path
            let secure = c.isSecure ? "TRUE" : "FALSE"
            let expiry = Int(c.expiresDate?.timeIntervalSince1970 ?? 9999999999)
            let name = c.name
            let value = c.value
            lines.append("\(domain)\t\(includeSubdomains)\t\(path)\t\(secure)\t\(expiry)\t\(name)\t\(value)")
        }
        let content = lines.joined(separator: "\n")
        try? content.write(to: cookieFile, atomically: true, encoding: .utf8)

        // Also save compact cookie string for display
        let compact = cookies.filter { $0.domain.contains("soundcloud") }
            .map { "\($0.name)=\($0.value)" }
            .joined(separator: "; ")
        await saveToken(compact, username: username)
        isAuthenticated = !cookies.isEmpty
    }

    var cookieFile: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Dotify/sc_cookies.txt")
    }

    func loadToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: keychainKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        if SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
           let data = result as? Data,
           let token = String(data: data, encoding: .utf8),
           !token.isEmpty {
            authToken = token
            isAuthenticated = true
            username = UserDefaults.standard.string(forKey: "suckfy.soundcloud.username") ?? ""
        }
    }

    func logout() {
        authToken = ""
        isAuthenticated = false
        username = ""
        try? FileManager.default.removeItem(at: cookieFile)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: keychainKey
        ]
        SecItemDelete(query as CFDictionary)
        UserDefaults.standard.removeObject(forKey: "suckfy.soundcloud.username")
    }

    // MARK: - Get track by URL via SoundCloud API
    
    func getTrackByURL(_ url: String) async throws -> SCTrack {
        // Extract track from URL via SoundCloud API
        let cleanURL = url.trimmingCharacters(in: .whitespaces)
        print("[SuckFy] Getting SoundCloud track from URL: \(cleanURL)")
        
        // Use resolve endpoint to get track info
        var components = URLComponents(string: "https://api-v2.soundcloud.com/resolve")!
        components.queryItems = [
            URLQueryItem(name: "url", value: cleanURL),
            URLQueryItem(name: "client_id", value: "iZIs9mchVcX5lhVRyQGGAYlNPVldzAoX") // Public client_id
        ]
        
        var request = URLRequest(url: components.url!)
        request.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", forHTTPHeaderField: "User-Agent")
        
        // Add OAuth token if available
        if !authToken.isEmpty {
            request.setValue("OAuth \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        let session = URLSession.shared
        let (data, response) = try await session.data(for: request)
        
        guard let httpResp = response as? HTTPURLResponse else {
            throw SCError.downloadFailed("Invalid response from SoundCloud API")
        }
        
        print("[SuckFy] SoundCloud API status: \(httpResp.statusCode)")
        
        guard httpResp.statusCode == 200 else {
            let body = String(data: data, encoding: .utf8) ?? ""
            print("[SuckFy] SoundCloud API error: \(body)")
            throw SCError.downloadFailed("SoundCloud API returned \(httpResp.statusCode)")
        }
        
        let json = try JSONDecoder().decode(SCAPITrack.self, from: data)
        
        // Process artwork URL - replace quality suffix for higher res
        let artworkURL: URL? = {
            guard let urlString = json.artwork_url else { return nil }
            let highRes = urlString.replacingOccurrences(of: "-large", with: "-t500x500")
            return URL(string: highRes)
        }()
        
        return SCTrack(
            id: String(json.id),
            title: json.title,
            artist: json.user.username,
            duration: TimeInterval(json.duration) / 1000.0,
            artworkURL: artworkURL,
            webURL: json.permalink_url
        )
    }

    // MARK: - Search via SoundCloud API

    func search(query: String, limit: Int = 15) async throws -> [SCTrack] {
        // Use SoundCloud API for search to get proper artwork URLs
        var components = URLComponents(string: "https://api-v2.soundcloud.com/search/tracks")!
        components.queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "client_id", value: "iZIs9mchVcX5lhVRyQGGAYlNPVldzAoX")
        ]
        
        var request = URLRequest(url: components.url!)
        request.setValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", forHTTPHeaderField: "User-Agent")
        
        // Add OAuth token if available
        if !authToken.isEmpty {
            request.setValue("OAuth \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw SCError.downloadFailed("SoundCloud search API failed")
        }
        
        // Parse JSON response
        struct SearchResponse: Decodable {
            let collection: [SCAPITrack]
        }
        
        let searchResult = try JSONDecoder().decode(SearchResponse.self, from: data)
        
        return searchResult.collection.map { track in
            // Process artwork URL - replace quality suffix for higher res
            let artworkURL: URL? = {
                guard let urlString = track.artwork_url else { return nil }
                let highRes = urlString.replacingOccurrences(of: "-large", with: "-t500x500")
                return URL(string: highRes)
            }()
            
            return SCTrack(
                id: String(track.id),
                title: track.title,
                artist: track.user.username,
                duration: TimeInterval(track.duration) / 1000.0,
                artworkURL: artworkURL,
                webURL: track.permalink_url
            )
        }
    }

    // MARK: - Download via yt-dlp

    func downloadTrack(
        track: SCTrack,
        onStatus: ((String) -> Void)? = nil,
        onProgress: ((Double) -> Void)? = nil
    ) async throws -> URL {
        // Check cache
        let cacheURL = cacheFile(for: track.id)
        if FileManager.default.fileExists(atPath: cacheURL.path) {
            return cacheURL
        }

        try FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)

        onStatus?("Connecting to SoundCloud…")
        onProgress?(0.05)

        var args = [
            ytdlpPath,
            "--no-playlist",
            "-x", "--audio-format", "mp3", "--audio-quality", "0",
            "-o", cacheDirectory.appendingPathComponent("%(id)s.%(ext)s").path,
            "--no-warnings",
            "--progress",
            "--newline"
        ]

        // Use OAuth token if available
        if !authToken.isEmpty {
            print("[SuckFy] Using OAuth token for download: \(authToken.prefix(20))...")
            args += ["--add-header", "Authorization:OAuth \(authToken)"]
        } else {
            print("[SuckFy] No OAuth token - downloading without authentication")
        }

        args.append(track.webURL)

        onStatus?("Downloading from SoundCloud…")

        // Run with progress parsing
        try await runProcessWithProgress(args, onStatus: onStatus, onProgress: onProgress)

        guard FileManager.default.fileExists(atPath: cacheURL.path) else {
            throw SCError.downloadFailed("File not found after download")
        }

        onProgress?(1.0)
        return cacheURL
    }

    // MARK: - Cache helpers

    var cacheDirectory: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Dotify/SoundCloud", isDirectory: true)
    }

    func cacheFile(for trackID: String) -> URL {
        cacheDirectory.appendingPathComponent("\(trackID).mp3")
    }

    func isCached(_ trackID: String) -> Bool {
        FileManager.default.fileExists(atPath: cacheFile(for: trackID).path)
    }

    // MARK: - Process helpers

    private func runProcess(_ args: [String]) async throws -> String {
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global().async {
                let process = Process()
                process.executableURL = URL(fileURLWithPath: args[0])
                process.arguments = Array(args.dropFirst())

                let pipe = Pipe()
                process.standardOutput = pipe
                process.standardError = Pipe()

                do {
                    try process.run()
                    process.waitUntilExit()
                    let data = pipe.fileHandleForReading.readDataToEndOfFile()
                    let output = String(data: data, encoding: .utf8) ?? ""
                    continuation.resume(returning: output)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    private func runProcessWithProgress(
        _ args: [String],
        onStatus: ((String) -> Void)?,
        onProgress: ((Double) -> Void)?
    ) async throws {
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global().async {
                let process = Process()
                process.executableURL = URL(fileURLWithPath: args[0])
                process.arguments = Array(args.dropFirst())

                let outPipe = Pipe()
                let errPipe = Pipe()
                process.standardOutput = outPipe
                process.standardError = errPipe

                outPipe.fileHandleForReading.readabilityHandler = { handle in
                    let data = handle.availableData
                    guard !data.isEmpty, let line = String(data: data, encoding: .utf8) else { return }

                    // Parse progress: [download]  45.2% of ...
                    if line.contains("[download]") {
                        if let pctRange = line.range(of: #"(\d+\.?\d*)%"#, options: .regularExpression),
                           let pct = Double(line[pctRange].dropLast()) {
                            let progress = pct / 100.0
                            Task { @MainActor in
                                onProgress?(0.05 + progress * 0.95)
                                onStatus?(String(format: "Downloading… %.0f%%", pct))
                            }
                        }
                    }
                }

                do {
                    try process.run()
                    process.waitUntilExit()
                    outPipe.fileHandleForReading.readabilityHandler = nil

                    if process.terminationStatus == 0 {
                        continuation.resume()
                    } else {
                        let errData = errPipe.fileHandleForReading.readDataToEndOfFile()
                        let errMsg = String(data: errData, encoding: .utf8) ?? "Unknown error"
                        continuation.resume(throwing: SCError.downloadFailed(errMsg))
                    }
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
}

// MARK: - SoundCloud Track Model

struct SCTrack: Identifiable {
    let id: String
    let title: String
    let artist: String
    let duration: TimeInterval
    let artworkURL: URL?
    let webURL: String

    var durationFormatted: String {
        let m = Int(duration) / 60
        let s = Int(duration) % 60
        return String(format: "%d:%02d", m, s)
    }

    /// Convert to universal Track model
    func toTrack() -> Track {
        Track(
            id: "sc:\(id)",
            title: title,
            artist: artist,
            album: "SoundCloud",
            artworkURL: artworkURL,
            duration: duration,
            source: .soundCloud
        )
    }
}

enum SCError: LocalizedError {
    case downloadFailed(String)
    case notAuthenticated

    var errorDescription: String? {
        switch self {
        case .downloadFailed(let msg): return "SoundCloud download failed: \(msg)"
        case .notAuthenticated: return "Please log in to SoundCloud to download full tracks"
        }
    }
}

// MARK: - SoundCloud API Models

private struct SCAPITrack: Decodable {
    let id: Int
    let title: String
    let user: SCAPIUser
    let duration: Int
    let artwork_url: String?
    let permalink_url: String
}

private struct SCAPIUser: Decodable {
    let username: String
}
