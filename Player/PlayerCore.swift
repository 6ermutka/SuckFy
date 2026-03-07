import Foundation
import SwiftUI
import Combine
import AVFoundation

enum RepeatMode { case off, one, all }

@MainActor
class PlayerCore: ObservableObject {

    // MARK: - Published State
    @Published var currentTrack: Track?
    @Published var queue: [Track] = []
    @Published var isPlaying: Bool = false
    @Published var progress: Double = 0.0
    @Published var currentTime: TimeInterval = 0
    @Published var volume: Double = 0.7 {
        didSet {
            eq.playerNode.volume = Float(volume)
            eq.engine.mainMixerNode.outputVolume = Float(volume)
        }
    }
    @Published var isShuffle: Bool = false
    @Published var repeatMode: RepeatMode = .off
    @Published var currentPlaylist: Playlist?

    // Download state
    @Published var isLoadingTrack: Bool = false
    @Published var downloadError: String?
    @Published var downloadProgress: Double = 0      // 0.0 – 1.0
    @Published var downloadStatus: String = ""       // "Searching…", "Downloading… 2.3 MB", etc.

    // MARK: - Private
    private let eq = EqualizerService.shared
    private var audioFile: AVAudioFile?
    private var displayTimer: Timer?
    private var trackDuration: TimeInterval = 0
    private var playbackStartTime: Date?
    private var playbackOffset: TimeInterval = 0
    private var shuffleHistory: [String] = []   // track IDs already played in shuffle
    private var isSeeking: Bool = false          // prevents seek from triggering handleTrackEnd
    private var isManualNext: Bool = false       // prevents handleTrackEnd loop on manual next

    // Reference to library
    @ObservedObject var library = LibraryManager.shared

    init() {
        setupEngine()
    }

    // MARK: - AVAudioEngine Setup

    private func setupEngine() {
        // Start timer for progress updates
        displayTimer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor [weak self] in
                self?.updateProgress()
            }
        }

        // Restart engine on config change (e.g. headphones plugged in)
        NotificationCenter.default.addObserver(
            forName: .AVAudioEngineConfigurationChange,
            object: eq.engine,
            queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor [weak self] in
                try? self?.eq.engine.start()
            }
        }
    }

    private func updateProgress() {
        guard isPlaying, let startTime = playbackStartTime, trackDuration > 0 else { return }
        let elapsed = Date().timeIntervalSince(startTime) + playbackOffset
        currentTime = min(elapsed, trackDuration)
        progress = currentTime / trackDuration
        if currentTime >= trackDuration {
            handleTrackEnd()
        }
    }

    // MARK: - Playback Controls

    func playPause() {
        if isPlaying {
            eq.playerNode.pause()
            playbackOffset = currentTime
            playbackStartTime = nil
            isPlaying = false
        } else {
            eq.playerNode.play()
            playbackStartTime = Date()
            isPlaying = true
        }
    }

    func play(_ track: Track, in playlist: Playlist? = nil) {
        // Set flag to prevent handleTrackEnd from old track interfering
        isManualNext = true
        
        if let playlist { currentPlaylist = playlist; queue = playlist.tracks }
        if !queue.contains(track) { queue.append(track) }
        Task { await loadAndPlay(track) }
    }

    /// Play a collection starting from a given index — fixes shuffle bug by
    /// setting the full queue first so next() always has tracks to pick from
    func playCollection(_ tracks: [Track], startIndex: Int) {
        queue = tracks
        shuffleHistory.removeAll()  // Reset shuffle history for new collection
        let idx = max(0, min(startIndex, tracks.count - 1))
        Task { await loadAndPlay(tracks[idx]) }
    }

    func next() {
        guard !queue.isEmpty else { return }
        
        // Set flag BEFORE any operations to prevent handleTrackEnd loop
        isManualNext = true
        if isShuffle {
            // Get tracks not yet played
            let unplayed = queue.filter { !shuffleHistory.contains($0.id) }
            if unplayed.isEmpty {
                // All tracks played — reset history and start over
                shuffleHistory.removeAll()
                if let first = queue.randomElement() {
                    Task { await loadAndPlay(first) }
                }
            } else {
                // Pick random unplayed track
                if let next = unplayed.randomElement() {
                    Task { await loadAndPlay(next) }
                }
            }
        } else {
            guard let current = currentTrack,
                  let idx = queue.firstIndex(of: current) else {
                if !queue.isEmpty { Task { await loadAndPlay(queue[0]) } }
                return
            }
            let nextIdx = (idx + 1) % queue.count
            Task { await loadAndPlay(queue[nextIdx]) }
        }
    }

    func previous() {
        if currentTime > 3 {
            seek(to: 0)
            return
        }
        guard let current = currentTrack,
              let idx = queue.firstIndex(of: current) else { return }
        let prevIdx = (idx - 1 + queue.count) % queue.count
        Task { await loadAndPlay(queue[prevIdx]) }
    }

    func seek(to fraction: Double) {
        let clamped = max(0, min(1, fraction))
        guard let audioFile else { return }
        let seekTime = clamped * trackDuration
        progress = clamped
        currentTime = seekTime
        playbackOffset = seekTime
        playbackStartTime = isPlaying ? Date() : nil

        let sampleRate = audioFile.processingFormat.sampleRate
        let framePosition = AVAudioFramePosition(seekTime * sampleRate)
        let framesToPlay = AVAudioFrameCount(audioFile.length - framePosition)
        guard framesToPlay > 0 else { return }

        // Set flag to prevent stop() from triggering handleTrackEnd
        isSeeking = true
        eq.playerNode.stop()

        eq.playerNode.scheduleSegment(
            audioFile,
            startingFrame: framePosition,
            frameCount: framesToPlay,
            at: nil
        ) { [weak self] in
            Task { @MainActor [weak self] in
                guard let self, !self.isSeeking else { return }
                self.handleTrackEnd()
            }
        }

        if isPlaying { eq.playerNode.play() }
        // Reset flag after scheduling is done
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.isSeeking = false
        }
    }

    func toggleShuffle() { isShuffle.toggle() }

    func toggleRepeat() {
        switch repeatMode {
        case .off:  repeatMode = .all
        case .all:  repeatMode = .one
        case .one:  repeatMode = .off
        }
    }

    // MARK: - Load & Play

    private func loadAndPlay(_ track: Track) async {
        isLoadingTrack = true
        downloadError = nil
        downloadProgress = 0
        downloadStatus = "Looking up track…"
        isPlaying = false
        currentTime = 0
        progress = 0
        playbackOffset = 0
        playbackStartTime = nil
        eq.playerNode.stop()

        // Fetch metadata if needed
        var richTrack = track
        let needsMetadata = track.title == "Spotify Track" || track.title == "Unknown Track" || track.title.isEmpty || track.artworkURL == nil
        if needsMetadata && !track.id.hasPrefix("itunes:") {
            downloadStatus = "Fetching track info…"
            if let fetched = try? await DownloadService.shared.getTrackMetadata(spotifyID: track.id) {
                richTrack = fetched
            }
        }

        currentTrack = richTrack
        library.addToRecent(richTrack)

        // Track shuffle history to avoid repeats
        if isShuffle && !shuffleHistory.contains(richTrack.id) {
            shuffleHistory.append(richTrack.id)
        }

        do {
            let audioURL: URL

            if richTrack.isSoundCloud, let scID = richTrack.soundCloudID {
                // SoundCloud track — use yt-dlp
                let scTrack = SCTrack(
                    id: scID,
                    title: richTrack.title,
                    artist: richTrack.artist,
                    duration: richTrack.duration,
                    artworkURL: richTrack.artworkURL,
                    webURL: richTrack.album // we store webURL in album field for SC tracks
                )
                if SoundCloudService.shared.isCached(scID) {
                    downloadStatus = "Loading from cache…"
                    audioURL = SoundCloudService.shared.cacheFile(for: scID)
                } else {
                    audioURL = try await SoundCloudService.shared.downloadTrack(
                        track: scTrack,
                        onStatus: { [weak self] status in
                            Task { @MainActor [weak self] in self?.downloadStatus = status }
                        },
                        onProgress: { [weak self] p in
                            Task { @MainActor [weak self] in self?.downloadProgress = p }
                        }
                    )
                }
            } else {
                // Spotify/iTunes track — use Tidal chain
                let cached = await DownloadService.shared.isCached(richTrack.id)
                if cached {
                    downloadStatus = "Loading from cache…"
                    audioURL = await DownloadService.shared.cacheFile(for: richTrack.id)
                } else {
                    audioURL = try await DownloadService.shared.downloadTrack(
                        trackID: richTrack.id,
                        title: richTrack.title,
                        artist: richTrack.artist,
                        onStatus: { [weak self] status in
                            Task { @MainActor [weak self] in self?.downloadStatus = status }
                        },
                        onProgress: { [weak self] p in
                            Task { @MainActor [weak self] in self?.downloadProgress = p }
                        }
                    )
                }
            }

            // Load audio file into AVAudioEngine
            let file = try AVAudioFile(forReading: audioURL)
            audioFile = file
            trackDuration = Double(file.length) / file.processingFormat.sampleRate

            // Restart engine if needed
            if !eq.engine.isRunning {
                try eq.engine.start()
            }

            // Schedule file
            eq.playerNode.stop()
            eq.playerNode.scheduleFile(file, at: nil) { [weak self] in
                Task { @MainActor [weak self] in
                    self?.handleTrackEnd()
                }
            }

            // Set volume
            eq.playerNode.volume = Float(volume)
            eq.engine.mainMixerNode.outputVolume = Float(volume)

            // Play
            eq.playerNode.play()
            playbackStartTime = Date()
            isPlaying = true
            isLoadingTrack = false
            downloadStatus = ""
            downloadProgress = 0

        } catch {
            isLoadingTrack = false
            downloadStatus = ""
            downloadProgress = 0
            downloadError = error.localizedDescription
            isPlaying = false
        }
    }

    // MARK: - Track End

    private func handleTrackEnd() {
        // Don't handle track end if we're seeking or manually calling next
        guard !isSeeking else { return }
        guard !isManualNext else {
            isManualNext = false // Reset flag
            return
        }
        guard isPlaying || currentTime >= trackDuration - 0.5 else { return }
        
        switch repeatMode {
        case .one:
            seek(to: 0)
        case .all:
            next()
        case .off:
            guard let current = currentTrack,
                  let idx = queue.firstIndex(of: current),
                  idx < queue.count - 1 else {
                isPlaying = false
                return
            }
            next()
        }
    }

    // MARK: - Formatted Time

    var currentTimeFormatted: String { format(currentTime) }
    var remainingTimeFormatted: String {
        "-" + format(max(0, trackDuration - currentTime))
    }

    private func format(_ t: TimeInterval) -> String {
        let t = max(0, t)
        return String(format: "%d:%02d", Int(t) / 60, Int(t) % 60)
    }
}
