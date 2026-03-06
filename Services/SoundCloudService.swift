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

    func saveToken(_ token: String, username: String = "") {
        authToken = token
        isAuthenticated = !token.isEmpty
        self.username = username

        // Save cookies to Keychain
        let data = token.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: keychainKey,
            kSecValueData as String: data
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
        UserDefaults.standard.set(username, forKey: "suckfy.soundcloud.username")
    }

    // Save cookies from WKWebView as Netscape cookie file for yt-dlp
    func saveCookies(_ cookies: [HTTPCookie]) {
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
        saveToken(compact, username: username)
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

    // MARK: - Search via yt-dlp

    func search(query: String, limit: Int = 15) async throws -> [SCTrack] {
        let args = [
            ytdlpPath,
            "--no-playlist",
            "--flat-playlist",
            "--print", "%(id)s|%(title)s|%(uploader)s|%(duration)s|%(thumbnail)s|%(webpage_url)s",
            "--no-warnings",
            "scsearch\(limit):\(query)"
        ]

        let output = try await runProcess(args)
        let lines = output.split(separator: "\n", omittingEmptySubsequences: true)

        return lines.compactMap { line -> SCTrack? in
            let parts = String(line).components(separatedBy: "|")
            guard parts.count >= 6 else { return nil }
            return SCTrack(
                id: parts[0],
                title: parts[1],
                artist: parts[2],
                duration: TimeInterval(parts[3]) ?? 0,
                artworkURL: URL(string: parts[4]),
                webURL: parts[5]
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

        // Use cookie file if available (most reliable method)
        if FileManager.default.fileExists(atPath: cookieFile.path) {
            args += ["--cookies", cookieFile.path]
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
