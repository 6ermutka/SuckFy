import Foundation
import SwiftUI
import CryptoKit

/// Service for caching artwork images to disk
@MainActor
class ArtworkCacheService: ObservableObject {
    static let shared = ArtworkCacheService()
    
    private let cacheDirectory: URL
    private let memoryCache = NSCache<NSString, NSData>()
    private let fileManager = FileManager.default
    
    // Track custom artwork overrides (trackID -> local file path)
    @Published private(set) var customArtwork: [String: URL] = [:]
    private let customArtworkKey = "suckfy.customArtwork"
    private let defaults = UserDefaults(suiteName: "com.suckfy.musicplayer") ?? UserDefaults.standard
    
    private init() {
        // Create cache directory in app support
        let appSupport = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        cacheDirectory = appSupport.appendingPathComponent("com.suckfy.musicplayer/ArtworkCache", isDirectory: true)
        
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        
        // Configure memory cache (limit to 50MB)
        memoryCache.totalCostLimit = 50 * 1024 * 1024
        memoryCache.countLimit = 100
        
        loadCustomArtwork()
    }
    
    // MARK: - Cache Operations
    
    /// Get cached image data for a URL
    func getCachedData(for url: URL) -> Data? {
        let key = cacheKey(for: url)
        
        // Check memory cache first
        if let data = memoryCache.object(forKey: key as NSString) {
            return data as Data
        }
        
        // Check disk cache
        let fileURL = cacheDirectory.appendingPathComponent(key)
        if let data = try? Data(contentsOf: fileURL) {
            // Store in memory cache for faster access
            memoryCache.setObject(data as NSData, forKey: key as NSString, cost: data.count)
            return data
        }
        
        return nil
    }
    
    /// Cache image data from URL
    func cacheData(_ data: Data, for url: URL) {
        let key = cacheKey(for: url)
        
        // Save to memory cache
        memoryCache.setObject(data as NSData, forKey: key as NSString, cost: data.count)
        
        // Save to disk cache
        let fileURL = cacheDirectory.appendingPathComponent(key)
        try? data.write(to: fileURL)
    }
    
    /// Download and cache image from URL
    func downloadAndCache(url: URL) async -> Data? {
        // Check if already cached
        if let cached = getCachedData(for: url) {
            return cached
        }
        
        // Download
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            cacheData(data, for: url)
            return data
        } catch {
            print("Failed to download artwork: \(error)")
            return nil
        }
    }
    
    // MARK: - Custom Artwork
    
    /// Set custom artwork for a track
    func setCustomArtwork(for trackID: String, imageURL: URL) {
        print("🎨 setCustomArtwork called for trackID: \(trackID)")
        print("📂 Source image URL: \(imageURL)")
        
        // Copy image to cache directory with track-specific name
        let customKey = "custom_\(trackID.replacingOccurrences(of: ":", with: "_"))"
        let destinationURL = cacheDirectory.appendingPathComponent(customKey)
        print("📍 Destination URL: \(destinationURL.path)")
        
        do {
            // Remove old custom artwork if exists
            if let oldURL = customArtwork[trackID] {
                print("🗑️ Removing old artwork at: \(oldURL.path)")
                try? fileManager.removeItem(at: oldURL)
            }
            
            // Copy new artwork
            if fileManager.fileExists(atPath: destinationURL.path) {
                print("⚠️ File exists at destination, removing...")
                try fileManager.removeItem(at: destinationURL)
            }
            
            // Start accessing security-scoped resource
            let gotAccess = imageURL.startAccessingSecurityScopedResource()
            defer {
                if gotAccess {
                    imageURL.stopAccessingSecurityScopedResource()
                }
            }
            
            print("📋 Copying file...")
            try fileManager.copyItem(at: imageURL, to: destinationURL)
            print("✅ File copied successfully!")
            
            customArtwork[trackID] = destinationURL
            saveCustomArtwork()
            
            print("💾 Saved to UserDefaults")
            print("🔢 Total custom artworks: \(customArtwork.count)")
            
            // Notify observers
            objectWillChange.send()
            print("📢 Notified observers")
        } catch {
            print("❌ Failed to set custom artwork: \(error)")
        }
    }
    
    /// Get custom artwork URL for a track
    func getCustomArtwork(for trackID: String) -> URL? {
        return customArtwork[trackID]
    }
    
    /// Remove custom artwork for a track
    func removeCustomArtwork(for trackID: String) {
        guard let url = customArtwork[trackID] else { return }
        
        try? fileManager.removeItem(at: url)
        customArtwork.removeValue(forKey: trackID)
        saveCustomArtwork()
        objectWillChange.send()
    }
    
    /// Check if track has custom artwork
    func hasCustomArtwork(for trackID: String) -> Bool {
        return customArtwork[trackID] != nil
    }
    
    // MARK: - Cache Management
    
    /// Clear all cached artwork
    func clearCache() {
        memoryCache.removeAllObjects()
        
        // Remove all files except custom artwork
        if let files = try? fileManager.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: nil) {
            for file in files where !file.lastPathComponent.hasPrefix("custom_") {
                try? fileManager.removeItem(at: file)
            }
        }
    }
    
    /// Get cache size in bytes
    func getCacheSize() -> Int64 {
        guard let files = try? fileManager.contentsOfDirectory(at: cacheDirectory, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }
        
        return files.reduce(0) { total, url in
            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0
            return total + Int64(size)
        }
    }
    
    // MARK: - Private Helpers
    
    private func cacheKey(for url: URL) -> String {
        let hash = SHA256.hash(data: Data(url.absoluteString.utf8))
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }
    
    private func saveCustomArtwork() {
        let paths = customArtwork.mapValues { $0.path }
        defaults.set(paths, forKey: customArtworkKey)
        defaults.synchronize()
    }
    
    private func loadCustomArtwork() {
        if let paths = defaults.dictionary(forKey: customArtworkKey) as? [String: String] {
            customArtwork = paths.compactMapValues { path in
                let url = URL(fileURLWithPath: path)
                return fileManager.fileExists(atPath: path) ? url : nil
            }
        }
    }
}
