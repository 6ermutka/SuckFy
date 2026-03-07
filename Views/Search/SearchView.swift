import SwiftUI

struct SearchView: View {
    @EnvironmentObject var player: PlayerCore
    @ObservedObject private var sc = SoundCloudService.shared
    @ObservedObject private var library = LibraryManager.shared
    @State private var selectedTab: SearchTab = .spotify
    @State private var searchText = ""
    @State private var spotifyURL = ""
    @State private var searchResults: [Track] = []
    @State private var scResults: [SCTrack] = []
    @State private var isSearching = false
    @State private var isLoadingURL = false
    @State private var searchError: String?
    @State private var urlError: String?
    @State private var searchTask: Task<Void, Never>?
    @State private var showSCAuth = false

    enum SearchTab { case spotify, soundcloud }
    
    // Computed properties to simplify UI logic
    private var isSCLocked: Bool {
        selectedTab == .soundcloud && !sc.isAuthenticated
    }
    
    private var searchPlaceholder: String {
        isSCLocked ? "Log in to search SoundCloud…" : "Search by track name or artist…"
    }
    
    private var urlPlaceholder: String {
        isSCLocked ? "Log in to paste SoundCloud links…" : "Paste Spotify or SoundCloud track link…"
    }
    
    private var linkIconColor: Color {
        if isSCLocked { return Color(nsColor: .tertiaryLabelColor) }
        if spotifyURL.isEmpty { return Color(nsColor: .secondaryLabelColor) }
        return spotifyURL.contains("soundcloud") ? .orange : .green
    }
    
    private var playButtonColor: Color {
        if spotifyURL.isEmpty { return .gray }
        return spotifyURL.contains("soundcloud") ? .orange : .green
    }
    
    private var searchBorderColor: Color {
        isSCLocked ? Color.orange.opacity(0.3) : Color(nsColor: .separatorColor).opacity(0.4)
    }
    
    private var urlBorderColor: Color {
        if urlError != nil { return Color.red.opacity(0.5) }
        return isSCLocked ? Color.orange.opacity(0.3) : Color.primary.opacity(0.12)
    }


    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 10) {
                // --- Tab picker ---
                HStack(spacing: 0) {
                    tabButton("Spotify", tab: .spotify, color: .green)
                    tabButton("SoundCloud", tab: .soundcloud, color: .orange)
                    Spacer()

                    // SC auth button
                    if selectedTab == .soundcloud {
                        Button {
                            if sc.isAuthenticated {
                                sc.logout()
                            } else {
                                showSCAuth = true
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: sc.isAuthenticated ? "person.fill.checkmark" : "person.badge.plus")
                                    .font(.system(size: 12))
                                Text(sc.isAuthenticated ? sc.username.isEmpty ? "Connected" : sc.username : "Log in")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundStyle(sc.isAuthenticated ? Color.orange : Color.secondary)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(sc.isAuthenticated ? Color.orange.opacity(0.15) : Color.primary.opacity(0.07), in: Capsule())
                        }
                        .buttonStyle(.plain)
                        .sheet(isPresented: $showSCAuth) {
                            SoundCloudAuthView()
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)

                // --- Search bar ---
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(isSCLocked ? Color(nsColor: .tertiaryLabelColor) : Color(nsColor: .secondaryLabelColor))

                    TextField(searchPlaceholder, text: $searchText)
                        .textFieldStyle(.plain)
                        .font(.system(size: 14))
                        .onSubmit { triggerSearch() }
                        .disabled(isSCLocked)

                    if !searchText.isEmpty {
                        Button { searchText = ""; searchResults = []; searchError = nil } label: {
                            Image(systemName: "xmark.circle.fill").foregroundStyle(Color(nsColor: .tertiaryLabelColor))
                        }.buttonStyle(.plain)
                    }
                    if isSearching { ProgressView().scaleEffect(0.65) }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(searchBorderColor, lineWidth: isSCLocked ? 1 : 0.5))
                .opacity(isSCLocked ? 0.6 : 1.0)
                .onChange(of: searchText) { scheduleSearch() }

                // --- Track URL bar (Spotify or SoundCloud) ---
                HStack(spacing: 8) {
                    HStack(spacing: 10) {
                        Image(systemName: "link")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(linkIconColor)

                        TextField(urlPlaceholder, text: $spotifyURL)
                            .textFieldStyle(.plain)
                            .font(.system(size: 14))
                            .onSubmit { loadTrackURL() }
                            .disabled(isSCLocked)

                        if !spotifyURL.isEmpty {
                            Button { spotifyURL = ""; urlError = nil } label: {
                                Image(systemName: "xmark.circle.fill").foregroundStyle(Color(nsColor: .tertiaryLabelColor))
                            }.buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(urlBorderColor, lineWidth: isSCLocked ? 1 : 0.5))
                    .opacity(isSCLocked ? 0.6 : 1.0)

                    if isLoadingURL {
                        ProgressView().scaleEffect(0.8).frame(width: 60)
                    } else {
                        Button(action: loadTrackURL) {
                            Text("Play")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(width: 60, height: 36)
                                .background(playButtonColor, in: RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                        .disabled(spotifyURL.isEmpty || isSCLocked)
                    }
                }

                // URL error
                if let err = urlError {
                    HStack(spacing: 6) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(.orange)
                        Text(err)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                    .padding(.horizontal, 4)
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 20)
            .padding(.bottom, 12)
            .animation(.easeInOut(duration: 0.2), value: urlError)

            Divider().opacity(0.5)

            // Content
            if selectedTab == .spotify {
                if searchText.isEmpty && searchResults.isEmpty {
                    emptyPrompt
                } else if let err = searchError {
                    errorView(err)
                } else if searchResults.isEmpty && !isSearching {
                    noResults
                } else {
                    resultsList
                }
            } else {
                scContent
            }
        }
        .background(.clear)
        .onChange(of: selectedTab) {
            searchText = ""
            searchResults = []
            scResults = []
            searchError = nil
        }
    }

    // MARK: - Tab Button
    private func tabButton(_ title: String, tab: SearchTab, color: Color) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.15)) { selectedTab = tab }
        } label: {
            Text(title)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(selectedTab == tab ? color : .secondary)
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(
                    selectedTab == tab ? color.opacity(0.12) : Color.clear,
                    in: Capsule()
                )
        }
        .buttonStyle(.plain)
    }

    // MARK: - SoundCloud Content
    private var scContent: some View {
        Group {
            if searchText.isEmpty && scResults.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "cloud.fill")
                        .font(.system(size: 48, weight: .light))
                        .foregroundStyle(.orange.opacity(0.5))
                    Text("Search SoundCloud")
                        .font(.system(size: 20, weight: .semibold))
                    Text(sc.isAuthenticated ?
                         "Search for tracks — full downloads available" :
                         "Log in for full tracks, or search for free tracks")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if scResults.isEmpty && !isSearching {
                noResults
            } else {
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(scResults) { scTrack in
                            SCTrackRow(scTrack: scTrack)
                                .onTapGesture {
                                    let track = Track(
                                        id: "sc:\(scTrack.id)",
                                        title: scTrack.title,
                                        artist: scTrack.artist,
                                        album: scTrack.webURL, // store webURL in album
                                        artworkURL: scTrack.artworkURL,
                                        duration: scTrack.duration,
                                        source: .soundCloud
                                    )
                                    player.play(track)
                                }
                                .contextMenu {
                                    let track = Track(
                                        id: "sc:\(scTrack.id)",
                                        title: scTrack.title,
                                        artist: scTrack.artist,
                                        album: scTrack.webURL,
                                        artworkURL: scTrack.artworkURL,
                                        duration: scTrack.duration,
                                        source: .soundCloud
                                    )
                                    
                                    Button {
                                        library.toggleLike(track)
                                    } label: {
                                        Label(library.isLiked(track) ? "Remove from Liked" : "Add to Liked",
                                              systemImage: library.isLiked(track) ? "heart.slash" : "heart")
                                    }
                                    
                                    if !library.playlists.isEmpty {
                                        Menu("Add to Playlist") {
                                            ForEach(library.playlists) { playlist in
                                                Button(playlist.name) {
                                                    library.addTrackToPlaylist(track, playlistID: playlist.id)
                                                }
                                            }
                                        }
                                    }
                                }
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                }
                .scrollIndicators(.hidden)
            }
        }
    }

    // MARK: - Track URL Import (Spotify or SoundCloud)

    private func loadTrackURL() {
        let raw = spotifyURL.trimmingCharacters(in: .whitespaces)
        NSLog("[SuckFy] loadTrackURL called with: \(raw)")
        guard !raw.isEmpty else { return }

        // Detect platform
        if raw.contains("soundcloud.com") {
            loadSoundCloudURL(raw)
        } else {
            loadSpotifyURL(raw)
        }
    }

    private func loadSpotifyURL(_ raw: String) {
        guard let trackID = extractSpotifyTrackID(from: raw) else {
            NSLog("[SuckFy] Failed to extract Spotify track ID from: \(raw)")
            urlError = "Invalid Spotify URL — make sure it contains /track/"
            return
        }

        NSLog("[SuckFy] Extracted Spotify track ID: \(trackID)")
        urlError = nil
        isLoadingURL = true

        // Pass minimal track — PlayerCore will fetch metadata automatically
        let track = Track(
            id: trackID,
            title: "Spotify Track",
            artist: "Loading…",
            album: "",
            artworkURL: nil,
            duration: 0
        )
        isLoadingURL = false
        spotifyURL = ""
        player.play(track)
    }

    private func loadSoundCloudURL(_ raw: String) {
        NSLog("[SuckFy] Loading SoundCloud URL: \(raw)")
        urlError = nil
        isLoadingURL = true

        Task {
            do {
                let scTrack = try await SoundCloudService.shared.getTrackByURL(raw)
                let track = Track(
                    id: "sc:\(scTrack.id)",
                    title: scTrack.title,
                    artist: scTrack.artist,
                    album: scTrack.webURL, // store webURL in album field
                    artworkURL: scTrack.artworkURL,
                    duration: scTrack.duration,
                    source: .soundCloud
                )
                await MainActor.run {
                    isLoadingURL = false
                    spotifyURL = ""
                    player.play(track)
                }
            } catch {
                await MainActor.run {
                    isLoadingURL = false
                    urlError = "Failed to load SoundCloud track: \(error.localizedDescription)"
                    NSLog("[SuckFy] SoundCloud URL error: \(error)")
                }
            }
        }
    }

    private func extractSpotifyTrackID(from url: String) -> String? {
        // Handles:
        // https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=xxx
        // spotify:track:4cOdK2wGLETKBW3PvgPWqT
        let cleaned = url.trimmingCharacters(in: .whitespaces)

        if cleaned.hasPrefix("spotify:track:") {
            let rest = String(cleaned.dropFirst("spotify:track:".count))
            return rest.components(separatedBy: CharacterSet(charactersIn: "?&")).first
        }

        // Parse as URL and extract path component before any query
        guard cleaned.contains("/track/") else { return nil }

        // Extract the part after /track/
        if let range = cleaned.range(of: "/track/") {
            let afterTrack = String(cleaned[range.upperBound...])
            // Take only up to ? or & or end
            let id = afterTrack.components(separatedBy: CharacterSet(charactersIn: "?&/ ")).first ?? ""
            return id.isEmpty ? nil : id
        }
        return nil
    }

    // MARK: - Search Logic

    private func scheduleSearch() {
        searchTask?.cancel()
        guard !searchText.trimmingCharacters(in: .whitespaces).isEmpty else {
            searchResults = []; scResults = []; searchError = nil; return
        }
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            await MainActor.run { triggerSearch() }
        }
    }

    private func triggerSearch() {
        let query = searchText.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else { return }
        isSearching = true
        searchError = nil

        if selectedTab == .spotify {
            Task {
                do {
                    let results = try await SpotifyService.shared.search(query: query, limit: 25)
                    let tracks = results.map { Track(from: $0) }
                    await MainActor.run { searchResults = tracks; isSearching = false }
                } catch {
                    await MainActor.run { searchError = error.localizedDescription; isSearching = false }
                }
            }
        } else {
            Task {
                do {
                    let results = try await SoundCloudService.shared.search(query: query, limit: 15)
                    await MainActor.run { scResults = results; isSearching = false }
                } catch {
                    await MainActor.run { searchError = error.localizedDescription; isSearching = false }
                }
            }
        }
    }

    // MARK: - States

    private var emptyPrompt: some View {
        VStack(spacing: 20) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(.quaternary)
            VStack(spacing: 8) {
                Text("Find your music")
                    .font(.system(size: 20, weight: .semibold))
                Text("Search by name — or paste a Spotify link above to play instantly")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    private var noResults: some View {
        VStack(spacing: 16) {
            Image(systemName: "music.note.slash")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(.quaternary)
            Text("No results for \"\(searchText)\"")
                .font(.system(size: 18, weight: .semibold))
            Text("Try a different search term")
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func errorView(_ msg: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(.orange)
            Text("Search failed")
                .font(.system(size: 18, weight: .semibold))
            Text(msg)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Try Again") { triggerSearch() }
                .buttonStyle(.borderedProminent)
                .controlSize(.small)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    private var resultsList: some View {
        ScrollView {
            LazyVStack(spacing: 2) {
                ForEach(searchResults) { track in
                    SearchTrackRow(track: track)
                        .onTapGesture { player.play(track) }
                        .contextMenu {
                            Button {
                                library.toggleLike(track)
                            } label: {
                                Label(library.isLiked(track) ? "Remove from Liked" : "Add to Liked", 
                                      systemImage: library.isLiked(track) ? "heart.slash" : "heart")
                            }
                            
                            if !library.playlists.isEmpty {
                                Menu("Add to Playlist") {
                                    ForEach(library.playlists) { playlist in
                                        Button(playlist.name) {
                                            library.addTrackToPlaylist(track, playlistID: playlist.id)
                                        }
                                    }
                                }
                            }
                        }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
        .scrollIndicators(.hidden)
    }
}

// MARK: - Search Result Row (Spotify/iTunes)

struct SearchTrackRow: View {
    let track: Track
    @State private var isHovered = false
    @EnvironmentObject var player: PlayerCore

    var isCurrentTrack: Bool { player.currentTrack?.id == track.id }

    var body: some View {
        HStack(spacing: 12) {
            ArtworkView(url: track.artworkURL, size: 44)

            VStack(alignment: .leading, spacing: 3) {
                Text(track.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(isCurrentTrack ? Color.green : .primary)
                    .lineLimit(1)
                Text(track.artist)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            if isCurrentTrack && player.isPlaying {
                Image(systemName: "waveform")
                    .symbolEffect(.variableColor.iterative)
                    .font(.system(size: 14))
                    .foregroundStyle(.green)
            }

            // Source badge
            SourceBadge(source: track.source)

            Text(track.durationFormatted)
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isHovered ? Color.primary.opacity(0.06) : Color.clear)
        )
        .contentShape(Rectangle())
        .onHover { isHovered = $0 }
        .animation(.easeInOut(duration: 0.12), value: isHovered)
    }
}

// MARK: - SoundCloud Track Row

struct SCTrackRow: View {
    let scTrack: SCTrack
    @State private var isHovered = false
    @EnvironmentObject var player: PlayerCore

    var isCurrentTrack: Bool { player.currentTrack?.id == "sc:\(scTrack.id)" }

    var body: some View {
        HStack(spacing: 12) {
            ArtworkView(url: scTrack.artworkURL, size: 44)

            VStack(alignment: .leading, spacing: 3) {
                Text(scTrack.title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(isCurrentTrack ? Color.orange : .primary)
                    .lineLimit(1)
                Text(scTrack.artist)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            if isCurrentTrack && player.isPlaying {
                Image(systemName: "waveform")
                    .symbolEffect(.variableColor.iterative)
                    .font(.system(size: 14))
                    .foregroundStyle(.orange)
            }

            // SC badge
            SourceBadge(source: .soundCloud)

            Text(scTrack.durationFormatted)
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isHovered ? Color.orange.opacity(0.06) : Color.clear)
        )
        .contentShape(Rectangle())
        .onHover { isHovered = $0 }
        .animation(.easeInOut(duration: 0.12), value: isHovered)
    }
}

// MARK: - Source Badge

struct SourceBadge: View {
    let source: TrackSource

    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: source.icon)
                .font(.system(size: 9, weight: .bold))
            Text(source.label)
                .font(.system(size: 10, weight: .semibold))
        }
        .foregroundStyle(source.color)
        .padding(.horizontal, 6)
        .padding(.vertical, 3)
        .background(source.color.opacity(0.12), in: Capsule())
    }
}

#Preview {
    SearchView()
        .environmentObject(PlayerCore())
        .frame(width: 700, height: 600)
}
