import SwiftUI

struct MainView: View {
    @EnvironmentObject var player: PlayerCore
    @StateObject private var library = LibraryManager.shared
    @State private var selectedItem: SidebarItem = .home
    @State private var selectedPlaylist: Playlist?

    var body: some View {
        #if os(macOS)
        macOSLayout
        #elseif os(iOS)
        iOSLayout
        #endif
    }
    
    // MARK: - macOS Layout
    private var macOSLayout: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                // Sidebar
                SidebarView(selectedItem: $selectedItem, selectedPlaylist: $selectedPlaylist)

                // Divider
                Divider().opacity(0.4)

                // Content Area
                contentArea
                
                // Queue sidebar (shown when showQueue is true)
                if player.showQueue {
                    VStack(spacing: 0) {
                        Divider()
                        QueueView()
                            .environmentObject(player)
                    }
                    .frame(width: 320)
                    .transition(.move(edge: .trailing))
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Download error banner
            errorBanner

            // Bottom player bar
            PlayerControlsView()
        }
        .background(.ultraThickMaterial)
    }
    
    // MARK: - iOS Layout
    private var iOSLayout: some View {
        VStack(spacing: 0) {
            TabView(selection: $selectedItem) {
                HomeView()
                    .environmentObject(library)
                    .tabItem {
                        Label("Home", systemImage: "house.fill")
                    }
                    .tag(SidebarItem.home)
                
                SearchView()
                    .tabItem {
                        Label("Search", systemImage: "magnifyingglass")
                    }
                    .tag(SidebarItem.search)
                
                LibraryView()
                    .environmentObject(library)
                    .tabItem {
                        Label("Library", systemImage: "music.note.list")
                    }
                    .tag(SidebarItem.library)
                
                LikedSongsView()
                    .environmentObject(library)
                    .tabItem {
                        Label("Liked", systemImage: "heart.fill")
                    }
                    .tag(SidebarItem.likedSongs)
            }
            
            if let err = player.downloadError {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.orange)
                    Text(err)
                        .font(.system(size: 12))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    Spacer()
                    Button {
                        player.downloadError = nil
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial)
            }
            
            PlayerControlsView()
                .environmentObject(library)
                .frame(height: 120)
                .padding(.bottom, 10)
        }
        .ignoresSafeArea(.keyboard, edges: .bottom)
    }
    
    // MARK: - Shared Components
    private var contentArea: some View {
        ZStack {
            // Background — use system window material
            Rectangle()
                .fill(.background)
                .ignoresSafeArea()

            if let playlist = selectedPlaylist {
                PlaylistView(playlist: playlist)
                    .environmentObject(library)
            } else {
                switch selectedItem {
                case .home:
                    HomeView()
                        .environmentObject(library)
                case .search:
                    SearchView()
                case .library:
                    LibraryView()
                        .environmentObject(library)
                case .likedSongs:
                    LikedSongsView()
                        .environmentObject(library)
                case .settings:
                    SettingsView()
                        .environmentObject(library)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    @ViewBuilder
    private var errorBanner: some View {
        if let err = player.downloadError {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                Text(err)
                    .font(.system(size: 12))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                Spacer()
                Button {
                    player.downloadError = nil
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial)
            .overlay(Divider().opacity(0.4), alignment: .top)
        }
    }
}

// MARK: - Library View (downloaded tracks)
struct LibraryView: View {
    @EnvironmentObject var library: LibraryManager
    @EnvironmentObject var player: PlayerCore
    @ObservedObject private var localization = LocalizationService.shared
    @State private var hoveredId: String?
    @State private var searchText: String = ""
    @State private var isEditMode: Bool = false
    @State private var selectedTracks: Set<String> = []
    @State private var showDeleteConfirmation: Bool = false
    @State private var selectedFilter: TrackSource? = nil
    
    var filteredTracks: [Track] {
        var tracks = library.downloadedTracks
        
        // Apply source filter
        if let filter = selectedFilter {
            tracks = tracks.filter { $0.source == filter }
        }
        
        // Apply search filter
        if !searchText.isEmpty {
            tracks = tracks.filter { track in
                track.title.localizedCaseInsensitiveContains(searchText) ||
                track.artist.localizedCaseInsensitiveContains(searchText) ||
                track.album.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        return tracks
    }

    var body: some View {
        #if os(iOS)
        NavigationView {
            libraryContent
        }
        #elseif os(macOS)
        libraryContent
        #endif
    }
    
    private var libraryContent: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 20) {
                ZStack {
                    LinearGradient(colors: [.blue, .purple], startPoint: .topLeading, endPoint: .bottomTrailing)
                    Image(systemName: "arrow.down.circle.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(.white)
                }
                .frame(width: 110, height: 110)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: .blue.opacity(0.4), radius: 16, x: 0, y: 8)

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(tr("MY LIBRARY")).font(.system(size: 11, weight: .semibold)).foregroundStyle(.secondary).tracking(1)
                            Text(tr("Downloaded Tracks")).font(.system(size: 36, weight: .bold))
                            Text("\(library.downloadedTracks.count) \(tr("tracks"))")
                                .font(.system(size: 13)).foregroundStyle(.secondary)
                        }
                        
                        Spacer()
                        
                        // Edit mode button
                        if !library.downloadedTracks.isEmpty {
                            Button {
                                withAnimation {
                                    isEditMode.toggle()
                                    if !isEditMode {
                                        selectedTracks.removeAll()
                                    }
                                }
                            } label: {
                                Text(tr(isEditMode ? "Done" : "Select"))
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(isEditMode ? .green : .primary)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(isEditMode ? Color.green.opacity(0.15) : Color.primary.opacity(0.06), in: Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    
                    // Search bar
                    HStack(spacing: 8) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                        TextField(tr("Search in library..."), text: $searchText)
                            .textFieldStyle(.plain)
                            .font(.system(size: 13))
                        if !searchText.isEmpty {
                            Button {
                                searchText = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.system(size: 12))
                                    .foregroundStyle(.secondary)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 8))
                    .frame(width: 280)
                    
                    // Source filter chips
                    HStack(spacing: 8) {
                        FilterChip(title: tr("All"), icon: nil, isSelected: selectedFilter == nil) {
                            selectedFilter = nil
                        }
                        FilterChip(title: tr("Spotify"), icon: "s.circle.fill", color: .green, isSelected: selectedFilter == .spotify) {
                            selectedFilter = .spotify
                        }
                        FilterChip(title: tr("SoundCloud"), icon: "cloud.fill", color: .orange, isSelected: selectedFilter == .soundCloud) {
                            selectedFilter = .soundCloud
                        }
                        FilterChip(title: tr("Import"), icon: "arrow.down.doc.fill", color: .purple, isSelected: selectedFilter == .imported) {
                            selectedFilter = .imported
                        }
                    }

                    // Play all button or Delete selected
                    if !filteredTracks.isEmpty {
                        HStack(spacing: 10) {
                            if isEditMode && !selectedTracks.isEmpty {
                                Button {
                                    showDeleteConfirmation = true
                                } label: {
                                    let deleteText = selectedTracks.count == 1 ? tr("Delete %d track") : tr("Delete %d tracks")
                                    Label(String(format: deleteText, selectedTracks.count), systemImage: "trash.fill")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 18)
                                        .padding(.vertical, 8)
                                        .background(Color.red, in: Capsule())
                                }
                                .buttonStyle(.plain)
                            } else if !isEditMode {
                                Button {
                                    player.isShuffle = true
                                    player.playCollection(filteredTracks, startIndex: Int.random(in: 0..<filteredTracks.count))
                                } label: {
                                    Label(tr("Shuffle"), systemImage: "shuffle")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(.black)
                                        .padding(.horizontal, 18)
                                        .padding(.vertical, 8)
                                        .background(Color.white, in: Capsule())
                                }
                                .buttonStyle(.plain)

                                Button {
                                    player.isShuffle = false
                                    player.playCollection(filteredTracks, startIndex: 0)
                                } label: {
                                    Label(tr("Play"), systemImage: "play.fill")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 18)
                                        .padding(.vertical, 8)
                                        .background(Color.green, in: Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 28)
            .padding(.bottom, 20)

            Divider().opacity(0.4)

            if library.downloadedTracks.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "arrow.down.circle")
                        .font(.system(size: 52, weight: .light))
                        .foregroundStyle(.quaternary)
                    Text(tr("No downloaded tracks"))
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(.secondary)
                    Text(tr("Play any track to download it automatically"))
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredTracks.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 52, weight: .light))
                        .foregroundStyle(.quaternary)
                    Text(tr("No tracks found"))
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(.secondary)
                    Text(tr("Try a different search term"))
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(Array(filteredTracks.enumerated()), id: \.element.id) { i, track in
                            DownloadedTrackRow(
                                track: track,
                                index: i,
                                isHovered: hoveredId == track.id,
                                isEditMode: isEditMode,
                                isSelected: selectedTracks.contains(track.id)
                            )
                            .platformHover(id: track.id, hoveredID: $hoveredId)
                            .onTapGesture {
                                if isEditMode {
                                    if selectedTracks.contains(track.id) {
                                        selectedTracks.remove(track.id)
                                    } else {
                                        selectedTracks.insert(track.id)
                                    }
                                }
                            }
                            .onTapGesture(count: 2) {
                                if !isEditMode {
                                    player.isShuffle = false
                                    player.playCollection(filteredTracks, startIndex: i)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .scrollIndicators(.hidden)
            }
        }
        .onAppear {
            library.loadDownloadedTracks()
        }
        .alert(selectedTracks.count == 1 ? tr("Delete Track") : String(format: tr("Delete %d tracks"), selectedTracks.count), isPresented: $showDeleteConfirmation) {
            Button(tr("Cancel"), role: .cancel) { }
            Button(tr("Delete"), role: .destructive) {
                deleteSelectedTracks()
            }
        } message: {
            Text(String(format: tr("Are you sure you want to delete %d track(s) from your device?"), selectedTracks.count))
        }
    }
    
    private func deleteSelectedTracks() {
        let tracksToDelete = filteredTracks.filter { selectedTracks.contains($0.id) }
        for track in tracksToDelete {
            library.deleteDownloadedTrack(track)
        }
        selectedTracks.removeAll()
        isEditMode = false
    }
}

// MARK: - Downloaded Track Row
struct DownloadedTrackRow: View {
    let track: Track
    let index: Int
    let isHovered: Bool
    var isEditMode: Bool = false
    var isSelected: Bool = false
    @EnvironmentObject var player: PlayerCore
    @EnvironmentObject var library: LibraryManager
    @State private var showDeleteConfirm = false
    @State private var fileSize: String = "..."

    var isCurrent: Bool { player.currentTrack?.id == track.id }

    var body: some View {
        HStack(spacing: 12) {
            // Selection checkbox or Index / play button
            if isEditMode {
                Button {
                    // Toggle handled by parent
                } label: {
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 20))
                        .foregroundStyle(isSelected ? .green : .secondary)
                }
                .buttonStyle(.plain)
                .frame(width: 28)
            } else {
                ZStack {
                    if isHovered || isCurrent {
                        Button { isCurrent ? player.playPause() : player.play(track) } label: {
                            Image(systemName: isCurrent && player.isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.green)
                        }
                        .buttonStyle(.plain)
                    } else {
                        Text("\(index + 1)")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(isCurrent ? .green : .secondary)
                    }
                }
                .frame(width: 28)
            }

            ArtworkView(url: track.artworkURL, size: 40, cornerRadius: 4, trackID: track.id)

            VStack(alignment: .leading, spacing: 3) {
                Text(track.title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(isCurrent ? .green : .primary)
                    .lineLimit(1)
                Text(track.artist)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            // Source badge
            HStack(spacing: 4) {
                Text(track.source.label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(track.source.color)
                Image(systemName: track.source.icon)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(track.source.color)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(track.source.color.opacity(0.1), in: RoundedRectangle(cornerRadius: 6))

            // File size
            Text(fileSize)
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(.tertiary)
                .frame(width: 60, alignment: .trailing)

            // Delete button (only in normal mode)
            if !isEditMode {
                Button {
                    showDeleteConfirm = true
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(.red)
                }
                .buttonStyle(.plain)
                .opacity(isHovered ? 1 : 0)
                .alert("Delete Track", isPresented: $showDeleteConfirm) {
                    Button("Cancel", role: .cancel) { }
                    Button("Delete", role: .destructive) {
                        library.deleteDownloadedTrack(track)
                    }
                } message: {
                    Text("Are you sure you want to delete '\(track.title)' from your device?")
                }
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isSelected ? Color.green.opacity(0.15) : (isCurrent ? Color.green.opacity(0.08) : (isHovered ? Color.primary.opacity(0.05) : Color.clear)))
        )
        .animation(.easeInOut(duration: 0.12), value: isHovered)
        .animation(.easeInOut(duration: 0.12), value: isSelected)
        .task {
            // Load file size asynchronously
            let size = await DownloadService.shared.getCachedFileSize(track.id)
            let mb = Double(size) / 1_048_576
            fileSize = String(format: "%.1f MB", mb)
        }
    }
}

struct PlaylistRow: View {
    let playlist: Playlist
    @State private var isHovered = false

    var body: some View {
        #if os(macOS)
        macOSRow
        #elseif os(iOS)
        NavigationLink(destination: PlaylistDetailView(playlist: playlist)) {
            iOSRow
        }
        .buttonStyle(.plain)
        #endif
    }
    
    private var macOSRow: some View {
        HStack(spacing: 14) {
            ArtworkView(url: playlist.artworkURL, size: 52, cornerRadius: 6, trackID: playlist.id)
                .id("\(playlist.id)-\(playlist.name)")
            VStack(alignment: .leading, spacing: 4) {
                Text(playlist.name)
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)
                Text("\(playlist.tracks.count) tracks")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(RoundedRectangle(cornerRadius: 8).fill(isHovered ? Color.primary.opacity(0.05) : Color.clear))
        .contentShape(Rectangle())
        .platformHover(isHovered: $isHovered)
    }
    
    private var iOSRow: some View {
        HStack(spacing: 14) {
            ArtworkView(url: playlist.artworkURL, size: 52, cornerRadius: 6, trackID: playlist.id)
                .id("\(playlist.id)-\(playlist.name)")
            VStack(alignment: .leading, spacing: 4) {
                Text(playlist.name)
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)
                    .foregroundStyle(.primary)
                Text("\(playlist.tracks.count) tracks")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }
}

// MARK: - Liked Songs View
struct LikedSongsView: View {
    @EnvironmentObject var library: LibraryManager
    @EnvironmentObject var player: PlayerCore
    @ObservedObject private var localization = LocalizationService.shared
    @State private var hoveredId: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(spacing: 20) {
                ZStack {
                    LinearGradient(colors: [.purple, .indigo], startPoint: .topLeading, endPoint: .bottomTrailing)
                    Image(systemName: "heart.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(.white)
                }
                .frame(width: 110, height: 110)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: .purple.opacity(0.4), radius: 16, x: 0, y: 8)

                VStack(alignment: .leading, spacing: 8) {
                    Text(tr("PLAYLIST")).font(.system(size: 11, weight: .semibold)).foregroundStyle(.secondary).tracking(1)
                    Text(tr("Liked Songs")).font(.system(size: 36, weight: .bold))
                    Text("\(library.likedSongs.count) \(tr("songs"))")
                        .font(.system(size: 13)).foregroundStyle(.secondary)

                    // Play / Shuffle buttons
                    if !library.likedSongs.isEmpty {
                        HStack(spacing: 10) {
                            // Shuffle
                            Button {
                                player.isShuffle = true
                                player.playCollection(library.likedSongs, startIndex: Int.random(in: 0..<library.likedSongs.count))
                            } label: {
                                Label(tr("Shuffle"), systemImage: "shuffle")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(.black)
                                    .padding(.horizontal, 18)
                                    .padding(.vertical, 8)
                                    .background(Color.white, in: Capsule())
                            }
                            .buttonStyle(.plain)

                            // Play
                            Button {
                                player.isShuffle = false
                                player.playCollection(library.likedSongs, startIndex: 0)
                            } label: {
                                Label(tr("Play"), systemImage: "play.fill")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 18)
                                    .padding(.vertical, 8)
                                    .background(Color.green, in: Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 28)
            .padding(.bottom, 20)

            Divider().opacity(0.4)

            if library.likedSongs.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "heart.slash")
                        .font(.system(size: 40, weight: .light)).foregroundStyle(.quaternary)
                    Text(tr("No liked songs yet"))
                        .font(.system(size: 16, weight: .semibold)).foregroundStyle(.secondary)
                    Text(tr("Tap ♥ on any track to save it here"))
                        .font(.system(size: 13)).foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(Array(library.likedSongs.enumerated()), id: \.element.id) { i, track in
                            TrackListRow(track: track, index: i, isHovered: hoveredId == track.id)
                                .platformHover(id: track.id, hoveredID: $hoveredId)
                                .onTapGesture(count: 2) {
                                    player.isShuffle = false
                                    player.playCollection(library.likedSongs, startIndex: i)
                                }
                                .contextMenu {
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
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .scrollIndicators(.hidden)
            }
        }
    }
}

// MARK: - Playlist View
struct PlaylistView: View {
    let playlist: Playlist
    @EnvironmentObject var library: LibraryManager
    @EnvironmentObject var player: PlayerCore
    @State private var hoveredId: String?
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(spacing: 20) {
                ArtworkView(url: playlist.artworkURL, size: 110, cornerRadius: 12, trackID: playlist.id, editable: true)
                    .id("\(playlist.id)-\(playlist.name)")
                    .shadow(color: .blue.opacity(0.4), radius: 16, x: 0, y: 8)

                VStack(alignment: .leading, spacing: 8) {
                    Text("PLAYLIST").font(.system(size: 11, weight: .semibold)).foregroundStyle(.secondary).tracking(1)
                    Text(playlist.name).font(.system(size: 36, weight: .bold))
                    if !playlist.description.isEmpty {
                        Text(playlist.description)
                            .font(.system(size: 13)).foregroundStyle(.secondary)
                    }
                    Text("\(playlist.tracks.count) songs")
                        .font(.system(size: 13)).foregroundStyle(.secondary)

                    // Play / Shuffle buttons
                    if !playlist.tracks.isEmpty {
                        HStack(spacing: 10) {
                            // Shuffle
                            Button {
                                player.isShuffle = true
                                player.playCollection(playlist.tracks, startIndex: Int.random(in: 0..<playlist.tracks.count))
                            } label: {
                                Label("Shuffle", systemImage: "shuffle")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(.black)
                                    .padding(.horizontal, 18)
                                    .padding(.vertical, 8)
                                    .background(Color.white, in: Capsule())
                            }
                            .buttonStyle(.plain)

                            // Play
                            Button {
                                player.isShuffle = false
                                player.playCollection(playlist.tracks, startIndex: 0)
                            } label: {
                                Label("Play", systemImage: "play.fill")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 18)
                                    .padding(.vertical, 8)
                                    .background(Color.green, in: Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(.horizontal, 24)
            .padding(.top, 28)
            .padding(.bottom, 20)

            Divider().opacity(0.4)

            if playlist.tracks.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "music.note.list")
                        .font(.system(size: 40, weight: .light)).foregroundStyle(.quaternary)
                    Text("No tracks in this playlist")
                        .font(.system(size: 16, weight: .semibold)).foregroundStyle(.secondary)
                    Text("Search for songs and add them to this playlist")
                        .font(.system(size: 13)).foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(Array(playlist.tracks.enumerated()), id: \.element.id) { i, track in
                            TrackListRow(track: track, index: i, isHovered: hoveredId == track.id)
                                .platformHover(id: track.id, hoveredID: $hoveredId)
                                .onTapGesture(count: 2) {
                                    player.isShuffle = false
                                    player.playCollection(playlist.tracks, startIndex: i)
                                }
                                .contextMenu {
                                    Button {
                                        library.removeTrackFromPlaylist(track, playlistID: playlist.id)
                                    } label: {
                                        Label("Remove from Playlist", systemImage: "minus.circle")
                                    }
                                }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .scrollIndicators(.hidden)
            }
        }
    }
}

struct TrackListRow: View {
    let track: Track
    let index: Int
    let isHovered: Bool
    @EnvironmentObject var player: PlayerCore
    @EnvironmentObject var library: LibraryManager

    var isCurrent: Bool { player.currentTrack?.id == track.id }

    var body: some View {
        HStack(spacing: 12) {
            // Index / play button
            ZStack {
                if isHovered || isCurrent {
                    Button { isCurrent ? player.playPause() : player.play(track) } label: {
                        Image(systemName: isCurrent && player.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.green)
                    }
                    .buttonStyle(.plain)
                } else {
                    Text("\(index + 1)")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(isCurrent ? .green : .secondary)
                }
            }
            .frame(width: 28)

            ArtworkView(url: track.artworkURL, size: 40, cornerRadius: 4, trackID: track.id)

            VStack(alignment: .leading, spacing: 3) {
                Text(track.title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(isCurrent ? .green : .primary)
                    .lineLimit(1)
                Text(track.artist)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            // Source badge
            HStack(spacing: 4) {
                Text(track.source.label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(track.source.color)
                Image(systemName: track.source.icon)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(track.source.color)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(track.source.color.opacity(0.1), in: RoundedRectangle(cornerRadius: 6))

            Button { library.toggleLike(track) } label: {
                Image(systemName: library.isLiked(track) ? "heart.fill" : "heart")
                    .font(.system(size: 13))
                    .foregroundStyle(library.isLiked(track) ? .green : .secondary)
            }
            .buttonStyle(.plain)
            .opacity(isHovered || library.isLiked(track) ? 1 : 0)

            Text(track.durationFormatted)
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(.tertiary)
                .frame(width: 42, alignment: .trailing)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isCurrent ? Color.green.opacity(0.08) : (isHovered ? Color.primary.opacity(0.05) : Color.clear))
        )
        .animation(.easeInOut(duration: 0.12), value: isHovered)
    }
}

#Preview {
    MainView()
        .environmentObject(PlayerCore())
        .frame(width: 1100, height: 700)
}

// MARK: - Create Playlist Sheet
struct CreatePlaylistSheetView: View {
    @Binding var isPresented: Bool
    @EnvironmentObject var library: LibraryManager
    @State private var playlistName = ""
    @State private var playlistDescription = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Name")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.secondary)
                        TextField("My Playlist", text: $playlistName)
                            .textFieldStyle(.roundedBorder)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Description (optional)")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.secondary)
                        TextField("Add a description...", text: $playlistDescription, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(3...5)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                
                Spacer()
            }
            .navigationTitle("Create Playlist")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        isPresented = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        createPlaylist()
                    }
                    .disabled(playlistName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
    
    private func createPlaylist() {
        let name = playlistName.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        
        let playlist = Playlist(
            id: UUID().uuidString,
            name: name,
            description: playlistDescription.trimmingCharacters(in: .whitespaces),
            artworkURL: nil,
            tracks: []
        )
        
        library.playlists.append(playlist)
        isPresented = false
    }
}

// MARK: - Playlist Detail View (iOS)
struct PlaylistDetailView: View {
    let playlist: Playlist
    @EnvironmentObject var library: LibraryManager
    @EnvironmentObject var player: PlayerCore
    @State private var hoveredId: String?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(spacing: 16) {
                    ArtworkView(url: playlist.artworkURL, size: 200, cornerRadius: 12, trackID: playlist.id, editable: true)
                        .id("\(playlist.id)-\(playlist.name)")
                        .shadow(color: .black.opacity(0.3), radius: 20)
                    
                    VStack(spacing: 8) {
                        Text(playlist.name)
                            .font(.system(size: 24, weight: .bold))
                            .multilineTextAlignment(.center)
                        
                        if !playlist.description.isEmpty {
                            Text(playlist.description)
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        
                        Text("\(playlist.tracks.count) songs")
                            .font(.system(size: 13))
                            .foregroundStyle(.tertiary)
                    }
                    
                    // Play / Shuffle buttons
                    if !playlist.tracks.isEmpty {
                        HStack(spacing: 12) {
                            Button {
                                player.isShuffle = true
                                player.playCollection(playlist.tracks, startIndex: Int.random(in: 0..<playlist.tracks.count))
                            } label: {
                                Label("Shuffle", systemImage: "shuffle")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .background(Color.green, in: Capsule())
                            }
                            
                            Button {
                                player.isShuffle = false
                                player.playCollection(playlist.tracks, startIndex: 0)
                            } label: {
                                Label("Play", systemImage: "play.fill")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundStyle(.white)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 12)
                                    .background(Color.blue, in: Capsule())
                            }
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, 20)
                    }
                }
                .padding(.top, 20)
                
                // Track list
                if playlist.tracks.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "music.note.list")
                            .font(.system(size: 40, weight: .light))
                            .foregroundStyle(.quaternary)
                        Text("No tracks in this playlist")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.secondary)
                        Text("Add songs using the + button in the player")
                            .font(.system(size: 13))
                            .foregroundStyle(.tertiary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 40)
                } else {
                    LazyVStack(spacing: 2) {
                        ForEach(Array(playlist.tracks.enumerated()), id: \.element.id) { i, track in
                            TrackListRow(track: track, index: i, isHovered: hoveredId == track.id)
                                .onTapGesture {
                                    player.isShuffle = false
                                    player.playCollection(playlist.tracks, startIndex: i)
                                }
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        library.removeTrackFromPlaylist(track, playlistID: playlist.id)
                                    } label: {
                                        Label("Remove", systemImage: "trash")
                                    }
                                }
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
        }
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
    }
}

// MARK: - Filter Chip
struct FilterChip: View {
    let title: String
    let icon: String?
    var color: Color = .primary
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 10))
                }
                Text(title)
                    .font(.system(size: 12, weight: .medium))
            }
            .foregroundStyle(isSelected ? .white : color)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? color : Color.primary.opacity(0.08), in: Capsule())
        }
        .buttonStyle(.plain)
    }
}
