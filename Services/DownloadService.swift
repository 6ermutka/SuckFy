import Foundation

// MARK: - Download Service
// Chain: Spotify ID → song.link API → Tidal ID → spotisaver.net → manifest → direct MP4 URL
// Falls back through multiple Tidal API mirrors

actor DownloadService {

    static let shared = DownloadService()

    private let session: URLSession
    private let tidalAPIs = [
        "https://hifi-one.spotisaver.net",
        "https://hifi-two.spotisaver.net",
        "https://triton.squid.wtf"
    ]
    private let userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: config)
    }

    // MARK: - Public: Get track metadata from song.link (for Spotify URL import)

    func getTrackMetadata(spotifyID: String) async throws -> Track {
        log("getTrackMetadata called for: \(spotifyID)")
        let spotifyURL = "https://open.spotify.com/track/\(spotifyID)"
        let encoded = spotifyURL.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? spotifyURL
        let url = URL(string: "https://api.song.link/v1-alpha.1/links?url=\(encoded)")!

        var req = URLRequest(url: url)
        req.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        req.timeoutInterval = 20

        let (data, _) = try await session.data(for: req)
        let json = try JSONDecoder().decode(SongLinkResponse.self, from: data)

        // Get metadata from entitiesByUniqueId
        // Prefer: spotify → deezer → apple → amazon → any
        let entityValues = Array(json.entitiesByUniqueId.values)
        let entity = entityValues.first(where: { $0.apiProvider == "spotify" })
            ?? entityValues.first(where: { $0.apiProvider == "deezer" })
            ?? entityValues.first(where: { $0.apiProvider == "appleMusic" })
            ?? entityValues.first(where: { $0.apiProvider == "amazon" })
            ?? entityValues.first

        let title = entity?.title ?? "Unknown Track"
        let artist = entity?.artistName ?? "Unknown Artist"
        // Use largest artwork — replace small sizes with 600x600
        let rawArtwork = entity?.thumbnailUrl ?? ""
        let bigArtwork = rawArtwork
            .replacingOccurrences(of: "100x100", with: "600x600")
            .replacingOccurrences(of: "320x320", with: "600x600")
            .replacingOccurrences(of: "500x500", with: "600x600")
        let artworkURL = URL(string: bigArtwork.isEmpty ? rawArtwork : bigArtwork)
        let duration = TimeInterval((entity?.duration ?? 0) / 1000)

        return Track(
            id: spotifyID,
            title: title,
            artist: artist,
            album: "",
            artworkURL: artworkURL,
            duration: duration
        )
    }

    // MARK: - Public: Get stream URL (without downloading)

    func getStreamURL(spotifyID: String, title: String = "", artist: String = "") async throws -> URL {
        // Step 1: Spotify/iTunes ID → Tidal ID via song.link
        let tidalID = try await getTidalID(spotifyID: spotifyID, title: title, artist: artist)

        // Step 2: Tidal ID → direct audio URL via spotisaver API
        let audioURL = try await getTidalAudioURL(tidalID: tidalID)
        return audioURL
    }

    // MARK: - Public: Download to cache

    func downloadTrack(
        trackID: String,
        title: String,
        artist: String,
        onStatus: ((String) -> Void)? = nil,
        onProgress: ((Double) -> Void)? = nil
    ) async throws -> URL {
        let cached = cacheFile(for: trackID)
        if FileManager.default.fileExists(atPath: cached.path) { return cached }

        onStatus?("Searching on song.link…")
        let remoteURL = try await getStreamURL(spotifyID: trackID, title: title, artist: artist)

        let ext = remoteURL.pathExtension.isEmpty ? "mp4" : remoteURL.pathExtension
        let destURL = cacheDirectory.appendingPathComponent("\(trackID).\(ext)")
        try FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)

        onStatus?("Connecting to Tidal…")
        onProgress?(0.0)

        // Use URLSession download with progress tracking via delegate
        let localURL = try await downloadWithProgress(from: remoteURL, to: destURL, onStatus: onStatus, onProgress: onProgress)
        return localURL
    }

    // MARK: - Download with progress

    private func downloadWithProgress(
        from remoteURL: URL,
        to destURL: URL,
        onStatus: ((String) -> Void)?,
        onProgress: ((Double) -> Void)?
    ) async throws -> URL {
        return try await withCheckedThrowingContinuation { continuation in
            let delegate = DownloadProgressDelegate(destURL: destURL, onStatus: onStatus, onProgress: onProgress) { result in
                continuation.resume(with: result)
            }
            let task = session.downloadTask(with: remoteURL)
            task.delegate = delegate
            // Keep delegate alive
            objc_setAssociatedObject(task, &AssociatedKeys.delegateKey, delegate, .OBJC_ASSOCIATION_RETAIN)
            task.resume()
        }
    }

    // MARK: - Step 1: Spotify/iTunes → Tidal ID via song.link

    private func getTidalID(spotifyID: String, title: String = "", artist: String = "") async throws -> Int64 {
        let queryURL: String

        if spotifyID.hasPrefix("itunes:") {
            let itunesID = String(spotifyID.dropFirst("itunes:".count))
            queryURL = "https://api.song.link/v1-alpha.1/links?url=https://music.apple.com/us/song/\(itunesID)"
        } else {
            let spotifyURL = "https://open.spotify.com/track/\(spotifyID)"
            queryURL = "https://api.song.link/v1-alpha.1/links?url=\(spotifyURL.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? spotifyURL)"
        }

        log("song.link query: \(queryURL)")
        var req = URLRequest(url: URL(string: queryURL)!)
        req.setValue(userAgent, forHTTPHeaderField: "User-Agent")
        req.timeoutInterval = 20

        let (data, resp) = try await session.data(for: req)
        let statusCode = (resp as? HTTPURLResponse)?.statusCode ?? 0
        log("song.link status: \(statusCode)")

        guard statusCode == 200 else {
            let body = String(data: data, encoding: .utf8) ?? ""
            log("song.link error body: \(body.prefix(200))")
            throw DownloadError.apiError("song.link HTTP \(statusCode)")
        }

        let json = try JSONDecoder().decode(SongLinkResponse.self, from: data)
        let platforms = json.linksByPlatform.keys.joined(separator: ", ")
        log("song.link platforms: \(platforms)")

        guard let tidalURL = json.linksByPlatform["tidal"]?.url else {
            throw DownloadError.noTidalMatch
        }
        log("Tidal URL: \(tidalURL)")

        guard let idStr = tidalURL.split(separator: "/").last,
              let id = Int64(idStr) else {
            throw DownloadError.apiError("Could not parse Tidal ID from: \(tidalURL)")
        }
        log("Tidal ID: \(id)")
        return id
    }

    private func log(_ msg: String) {
        let line = "[SuckFy] \(msg)\n"
        print(line, terminator: "")
        // Also write to file for debugging
        if let data = line.data(using: .utf8) {
            let logURL = FileManager.default.temporaryDirectory.appendingPathComponent("suckfy_debug.log")
            if let handle = try? FileHandle(forWritingTo: logURL) {
                handle.seekToEndOfFile()
                handle.write(data)
                try? handle.close()
            } else {
                try? data.write(to: logURL)
            }
        }
    }

    // MARK: - Step 2: Tidal ID → audio URL via spotisaver/triton

    private func getTidalAudioURL(tidalID: Int64) async throws -> URL {
        var lastError: Error = DownloadError.noLink

        for api in tidalAPIs {
            do {
                let url = URL(string: "\(api)/track/?id=\(tidalID)&quality=HIGH")!
                var req = URLRequest(url: url)
                req.setValue(userAgent, forHTTPHeaderField: "User-Agent")
                req.timeoutInterval = 15

                let (data, resp) = try await session.data(for: req)
                guard let httpResp = resp as? HTTPURLResponse, httpResp.statusCode == 200 else {
                    print("[SuckFy] \(api) returned non-200")
                    continue
                }

                let raw = String(data: data, encoding: .utf8) ?? ""
                print("[SuckFy] \(api) response: \(raw.prefix(200))")

                // Try v2 response with manifest (main format)
                if let v2 = try? JSONDecoder().decode(TidalV2Response.self, from: data),
                   let manifest = v2.data?.manifest,
                   !manifest.isEmpty {
                    print("[SuckFy] Got manifest from \(api)")
                    let audioURL = try decodeManifest(manifest)
                    return audioURL
                }

                // Try v1 response (OriginalTrackUrl)
                if let v1 = try? JSONDecoder().decode(TidalV1Response.self, from: data),
                   !v1.OriginalTrackUrl.isEmpty,
                   let directURL = URL(string: v1.OriginalTrackUrl) {
                    print("[SuckFy] Got direct URL from \(api)")
                    return directURL
                }

                print("[SuckFy] \(api) — could not parse response")

            } catch {
                print("[SuckFy] \(api) error: \(error)")
                lastError = error
            }
        }
        throw lastError
    }

    // MARK: - Decode base64 manifest → audio URL

    private func decodeManifest(_ base64: String) throws -> URL {
        guard let data = Data(base64Encoded: base64, options: .ignoreUnknownCharacters),
              let manifest = try? JSONDecoder().decode(TidalManifest.self, from: data),
              let urlStr = manifest.urls.first,
              let url = URL(string: urlStr) else {
            throw DownloadError.apiError("Failed to decode Tidal manifest")
        }
        return url
    }

    // MARK: - Cache helpers

    var cacheDirectory: URL {
        FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Dotify", isDirectory: true)
    }

    func cacheFile(for trackID: String) -> URL {
        let extensions = ["mp4", "m4a", "mp3", "flac"]
        
        // Check if it's a SoundCloud track
        if trackID.hasPrefix("sc:") {
            let scID = String(trackID.dropFirst(3))
            let soundCloudCache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
                .appendingPathComponent("Dotify/SoundCloud", isDirectory: true)
            
            for ext in extensions {
                let url = soundCloudCache.appendingPathComponent("\(scID).\(ext)")
                if FileManager.default.fileExists(atPath: url.path) { return url }
            }
            return soundCloudCache.appendingPathComponent("\(scID).mp3")
        }
        
        // Check for any cached extension in main cache
        for ext in extensions {
            let url = cacheDirectory.appendingPathComponent("\(trackID).\(ext)")
            if FileManager.default.fileExists(atPath: url.path) { return url }
        }
        return cacheDirectory.appendingPathComponent("\(trackID).mp4")
    }

    func isCached(_ trackID: String) -> Bool {
        let extensions = ["mp4", "m4a", "mp3", "flac"]
        return extensions.contains { ext in
            FileManager.default.fileExists(
                atPath: cacheDirectory.appendingPathComponent("\(trackID).\(ext)").path
            )
        }
    }

    func clearCache() throws {
        if FileManager.default.fileExists(atPath: cacheDirectory.path) {
            try FileManager.default.removeItem(at: cacheDirectory)
        }
    }
    
    // MARK: - Get all cached tracks
    
    func getAllCachedTracks() -> [String] {
        var trackIDs: [String] = []
        let extensions = ["mp4", "m4a", "mp3", "flac"]
        
        // Get tracks from main cache directory (Spotify/iTunes)
        if let files = try? FileManager.default.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: nil) {
            let spotifyTracks = files.compactMap { url -> String? in
                let filename = url.deletingPathExtension().lastPathComponent
                let ext = url.pathExtension
                guard extensions.contains(ext) else { return nil }
                return filename
            }
            trackIDs.append(contentsOf: spotifyTracks)
        }
        
        // Get tracks from SoundCloud cache directory
        let soundCloudCache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Dotify/SoundCloud", isDirectory: true)
        
        if let files = try? FileManager.default.contentsOfDirectory(at: soundCloudCache, includingPropertiesForKeys: nil) {
            let scTracks = files.compactMap { url -> String? in
                let filename = url.deletingPathExtension().lastPathComponent
                let ext = url.pathExtension
                guard extensions.contains(ext) else { return nil }
                // Add "sc:" prefix to identify SoundCloud tracks
                return "sc:\(filename)"
            }
            trackIDs.append(contentsOf: scTracks)
        }
        
        return trackIDs
    }
    
    // MARK: - Delete cached track
    
    func deleteCachedTrack(_ trackID: String) throws {
        let extensions = ["mp4", "m4a", "mp3", "flac"]
        
        // Check if it's a SoundCloud track
        if trackID.hasPrefix("sc:") {
            let scID = String(trackID.dropFirst(3))
            let soundCloudCache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
                .appendingPathComponent("Dotify/SoundCloud", isDirectory: true)
            
            for ext in extensions {
                let url = soundCloudCache.appendingPathComponent("\(scID).\(ext)")
                if FileManager.default.fileExists(atPath: url.path) {
                    try FileManager.default.removeItem(at: url)
                    print("[SuckFy] Deleted SoundCloud cached track: \(scID).\(ext)")
                }
            }
        } else {
            // Delete from main cache
            for ext in extensions {
                let url = cacheDirectory.appendingPathComponent("\(trackID).\(ext)")
                if FileManager.default.fileExists(atPath: url.path) {
                    try FileManager.default.removeItem(at: url)
                    print("[SuckFy] Deleted cached track: \(trackID).\(ext)")
                }
            }
        }
    }
    
    // MARK: - Get cache file size for a track
    
    func getCachedFileSize(_ trackID: String) -> Int64 {
        let extensions = ["mp4", "m4a", "mp3", "flac"]
        
        // Check if it's a SoundCloud track
        if trackID.hasPrefix("sc:") {
            let scID = String(trackID.dropFirst(3))
            let soundCloudCache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
                .appendingPathComponent("Dotify/SoundCloud", isDirectory: true)
            
            for ext in extensions {
                let url = soundCloudCache.appendingPathComponent("\(scID).\(ext)")
                if let attrs = try? FileManager.default.attributesOfItem(atPath: url.path),
                   let size = attrs[.size] as? Int64 {
                    return size
                }
            }
        } else {
            // Check main cache
            for ext in extensions {
                let url = cacheDirectory.appendingPathComponent("\(trackID).\(ext)")
                if let attrs = try? FileManager.default.attributesOfItem(atPath: url.path),
                   let size = attrs[.size] as? Int64 {
                    return size
                }
            }
        }
        return 0
    }
}

// MARK: - Response Models

private struct SongLinkResponse: Decodable {
    let linksByPlatform: [String: PlatformLink]
    let entitiesByUniqueId: [String: SongEntity]

    struct PlatformLink: Decodable { let url: String }
}

private struct SongEntity: Decodable {
    let title: String?
    let artistName: String?
    let thumbnailUrl: String?
    let apiProvider: String?
    let duration: Int?
}

private struct TidalV1Response: Decodable {
    let OriginalTrackUrl: String
}

// Response: {"version":"2.4","data":{"trackId":123,"manifest":"base64...",...}}
private struct TidalV2Response: Decodable {
    let data: TidalV2Data?

    struct TidalV2Data: Decodable {
        let trackId: Int64?
        let manifest: String?
        let manifestMimeType: String?
        let assetPresentation: String?
    }
}

private struct TidalManifest: Decodable {
    let mimeType: String?
    let urls: [String]
}

// MARK: - Associated Keys for objc_setAssociatedObject

private enum AssociatedKeys {
    static var delegateKey = "delegateKey"
}

// MARK: - Download Progress Delegate

private class DownloadProgressDelegate: NSObject, URLSessionDownloadDelegate {
    private let destURL: URL
    private let onStatus: ((String) -> Void)?
    private let onProgress: ((Double) -> Void)?
    private let completion: (Result<URL, Error>) -> Void

    init(destURL: URL, onStatus: ((String) -> Void)?, onProgress: ((Double) -> Void)?, completion: @escaping (Result<URL, Error>) -> Void) {
        self.destURL = destURL
        self.onStatus = onStatus
        self.onProgress = onProgress
        self.completion = completion
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
        do {
            if FileManager.default.fileExists(atPath: destURL.path) {
                try FileManager.default.removeItem(at: destURL)
            }
            try FileManager.default.moveItem(at: location, to: destURL)
            onProgress?(1.0)
            onStatus?("Done!")
            completion(.success(destURL))
        } catch {
            completion(.failure(error))
        }
    }

    func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64, totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
        let mb = Double(totalBytesWritten) / 1_048_576
        if totalBytesExpectedToWrite > 0 {
            let progress = Double(totalBytesWritten) / Double(totalBytesExpectedToWrite)
            let totalMb = Double(totalBytesExpectedToWrite) / 1_048_576
            onProgress?(progress)
            onStatus?(String(format: "Downloading… %.1f / %.1f MB", mb, totalMb))
        } else {
            onStatus?(String(format: "Downloading… %.1f MB", mb))
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error {
            completion(.failure(error))
        }
    }
}

// MARK: - Errors

enum DownloadError: LocalizedError {
    case apiError(String)
    case noLink
    case noTidalMatch
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .apiError(let msg):  return "API Error: \(msg)"
        case .noLink:             return "No download link available for this track"
        case .noTidalMatch:       return "Track not found on Tidal. Try a different track."
        case .networkError(let e): return e.localizedDescription
        }
    }
}
