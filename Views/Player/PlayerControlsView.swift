import SwiftUI

struct PlayerControlsView: View {
    @EnvironmentObject var player: PlayerCore
    @EnvironmentObject var library: LibraryManager
    
    #if os(iOS)
    @Environment(\.horizontalSizeClass) var horizontalSizeClass
    #endif
    @State private var showEqualizer = false
    @State private var showAddToPlaylist = false

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
            Divider().opacity(0.4)

            HStack(spacing: 0) {
                leftSection.frame(maxWidth: .infinity, alignment: .leading)
                centerSection.frame(maxWidth: .infinity)
                rightSection.frame(maxWidth: .infinity, alignment: .trailing)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .frame(height: 86)
            .background(.ultraThinMaterial)
        }
    }
    
    // MARK: - iOS Layout  
    private var iOSLayout: some View {
        VStack(spacing: 6) {
            Divider().opacity(0.4)
            
            // Track info и controls
            HStack(spacing: 12) {
                // Artwork
                ZStack {
                    ArtworkView(
                        url: player.currentTrack?.artworkURL,
                        size: 50,
                        cornerRadius: 6,
                        trackID: player.currentTrack?.id,
                        editable: false
                    )
                    if player.isLoadingTrack {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.black.opacity(0.45))
                        ProgressView().scaleEffect(0.7).tint(.white)
                    }
                }
                
                // Track info
                VStack(alignment: .leading, spacing: 2) {
                    if let track = player.currentTrack {
                        Text(track.title)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(.primary)
                            .lineLimit(1)
                        Text(track.artist)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                        
                        // Download status
                        if player.isLoadingTrack {
                            HStack(spacing: 4) {
                                Text(player.downloadStatus)
                                    .font(.system(size: 10))
                                    .foregroundStyle(.tertiary)
                                if player.downloadProgress > 0 {
                                    Text("(\(Int(player.downloadProgress * 100))%)")
                                        .font(.system(size: 10))
                                        .foregroundStyle(.tertiary)
                                }
                            }
                        }
                    } else {
                        Text("SuckFy")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(.secondary)
                        Text("Search for a track")
                            .font(.system(size: 12))
                            .foregroundStyle(.tertiary)
                    }
                }
                
                Spacer()
                
                // Action buttons (like, add to playlist)
                if let track = player.currentTrack {
                    HStack(spacing: 16) {
                        Button {
                            library.toggleLike(track)
                        } label: {
                            Image(systemName: library.isLiked(track) ? "heart.fill" : "heart")
                                .font(.system(size: 18))
                                .foregroundStyle(library.isLiked(track) ? Color.green : .secondary)
                        }
                        .buttonStyle(.plain)
                        
                        if !library.playlists.isEmpty {
                            Menu {
                                ForEach(library.playlists) { playlist in
                                    Button {
                                        library.addTrackToPlaylist(track, playlistID: playlist.id)
                                    } label: {
                                        Label(playlist.name, systemImage: "music.note.list")
                                    }
                                }
                            } label: {
                                Image(systemName: "text.badge.plus")
                                    .font(.system(size: 18))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
            
            // Progress slider
            VStack(spacing: 4) {
                PlayerSliderView(
                    value: Binding(
                        get: { player.progress },
                        set: { _ in }
                    ),
                    onSeek: { newValue in
                        player.seek(to: newValue)
                    }
                )
                .frame(height: 20)
                
                HStack {
                    Text(formatTime(player.currentTime))
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(formatTime(player.currentTrack?.duration ?? 0))
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, 16)
            
            // Playback controls
            HStack(spacing: 24) {
                Button { player.toggleShuffle() } label: {
                    Image(systemName: "shuffle")
                        .font(.system(size: 16))
                        .foregroundStyle(player.isShuffle ? .green : .secondary)
                }
                .buttonStyle(.plain)
                
                Button { player.previous() } label: {
                    Image(systemName: "backward.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(.primary)
                }
                .buttonStyle(.plain)
                
                Button { player.playPause() } label: {
                    Image(systemName: player.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.primary)
                }
                .buttonStyle(.plain)
                
                Button { player.next() } label: {
                    Image(systemName: "forward.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(.primary)
                }
                .buttonStyle(.plain)
                
                Button { player.toggleRepeat() } label: {
                    Image(systemName: player.repeatMode == .one ? "repeat.1" : "repeat")
                        .font(.system(size: 16))
                        .foregroundStyle(player.repeatMode != .off ? .green : .secondary)
                }
                .buttonStyle(.plain)
            }
            .frame(maxWidth: .infinity)
            .padding(.bottom, 8)
        }
        .background(.ultraThinMaterial)
    }
    
    private func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    // MARK: - Left: Track Info

    private var leftSection: some View {
        HStack(spacing: 12) {
            ZStack {
                ArtworkView(
                    url: player.currentTrack?.artworkURL,
                    size: 52,
                    cornerRadius: 6,
                    trackID: player.currentTrack?.id,
                    editable: true
                )
                if player.isLoadingTrack {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.black.opacity(0.45))
                    ProgressView().scaleEffect(0.7).tint(.white)
                }
            }

            if let track = player.currentTrack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(track.title)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    Text(track.artist)
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                    Text(track.album)
                        .font(.system(size: 11))
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }

                HStack(spacing: 12) {
                    Button {
                        library.toggleLike(track)
                    } label: {
                        Image(systemName: library.isLiked(track) ? "heart.fill" : "heart")
                            .font(.system(size: 14))
                            .foregroundStyle(library.isLiked(track) ? Color.green : .secondary)
                            .contentTransition(.symbolEffect(.replace))
                    }
                    .buttonStyle(.plain)
                    .help("Like")
                    
                    if !library.playlists.isEmpty {
                        Menu {
                            Text("Add to playlist").font(.headline)
                            Divider()
                            ForEach(library.playlists) { playlist in
                                Button {
                                    library.addTrackToPlaylist(track, playlistID: playlist.id)
                                } label: {
                                    Label(playlist.name, systemImage: "music.note.list")
                                }
                            }
                        } label: {
                            Image(systemName: "text.badge.plus")
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                        }
                        .menuStyle(.borderlessButton)
                        .menuIndicator(.hidden)
                        .fixedSize()
                        .help("Add to Playlist")
                    }
                }
                .padding(.leading, 8)
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    Text("SuckFy")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.secondary)
                    Text("Search for a track to play")
                        .font(.system(size: 12))
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()
        }
    }

    // MARK: - Center: Playback

    private var centerSection: some View {
        VStack(spacing: 6) {
            HStack(spacing: 22) {
                controlBtn("shuffle", active: player.isShuffle, size: 14) { player.toggleShuffle() }
                    .disabled(player.isLoadingTrack)
                controlBtn("backward.fill", size: 16) { player.previous() }
                    .disabled(player.isLoadingTrack)

                // Play / Pause / Loading
                ZStack {
                    // Circular progress ring when loading
                    if player.isLoadingTrack && player.downloadProgress > 0 {
                        Circle()
                            .stroke(Color.green.opacity(0.25), lineWidth: 3)
                            .frame(width: 38, height: 38)
                        Circle()
                            .trim(from: 0, to: player.downloadProgress)
                            .stroke(Color.green, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                            .frame(width: 38, height: 38)
                            .rotationEffect(.degrees(-90))
                            .animation(.linear(duration: 0.2), value: player.downloadProgress)
                    } else {
                        Circle().fill(Color.green).frame(width: 38, height: 38)
                    }

                    if player.isLoadingTrack {
                        ProgressView()
                            .scaleEffect(0.6)
                            .tint(player.downloadProgress > 0 ? .white : .white)
                    } else {
                        Button { player.playPause() } label: {
                            Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        .buttonStyle(.plain)
                    }
                }

                controlBtn("forward.fill", size: 16) { player.next() }
                    .disabled(player.isLoadingTrack)
                controlBtn(repeatIcon, active: player.repeatMode != .off, size: 14) { player.toggleRepeat() }
            }

            // Download status / Progress bar
            if player.isLoadingTrack {
                VStack(spacing: 4) {
                    // Status text
                    Text(player.downloadStatus)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .transition(.opacity)

                    // Progress bar
                    if player.downloadProgress > 0 {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule()
                                    .fill(Color.primary.opacity(0.1))
                                    .frame(height: 3)
                                Capsule()
                                    .fill(Color.green)
                                    .frame(width: geo.size.width * player.downloadProgress, height: 3)
                                    .animation(.linear(duration: 0.2), value: player.downloadProgress)
                            }
                        }
                        .frame(height: 3)
                    } else {
                        // Indeterminate progress
                        ProgressView()
                            .progressViewStyle(.linear)
                            .tint(.green)
                            .scaleEffect(x: 1, y: 0.6)
                    }
                }
                .frame(maxWidth: 280)
                .animation(.easeInOut(duration: 0.2), value: player.isLoadingTrack)
            } else {
                // Normal playback progress
                HStack(spacing: 6) {
                    Text(player.currentTimeFormatted)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(.tertiary)
                        .frame(minWidth: 32, alignment: .trailing)

                    PlayerSliderView(value: $player.progress, onSeek: { player.seek(to: $0) })

                    Text(player.remainingTimeFormatted)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(.tertiary)
                        .frame(minWidth: 36, alignment: .leading)
                }
            }
        }
    }

    private var repeatIcon: String {
        switch player.repeatMode {
        case .off: return "repeat"
        case .all: return "repeat"
        case .one: return "repeat.1"
        }
    }

    @ViewBuilder
    private func controlBtn(_ icon: String, active: Bool = false, size: CGFloat, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: size, weight: .semibold))
                .foregroundStyle(active ? Color.green : Color.secondary)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Right: Volume + EQ

    private var rightSection: some View {
        HStack(spacing: 10) {
            Image(systemName: player.volume < 0.01 ? "speaker.slash.fill" : (player.volume < 0.4 ? "speaker.fill" : "speaker.wave.2.fill"))
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
                .onTapGesture {
                    player.volume = player.volume > 0 ? 0 : 0.7
                }

            PlayerSliderView(value: $player.volume, onSeek: nil)
                .frame(width: 90)

            // Queue button
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                    player.showQueue.toggle()
                }
            } label: {
                Image(systemName: player.showQueue ? "list.bullet.circle.fill" : "list.bullet")
                    .font(.system(size: 14))
                    .foregroundStyle(player.showQueue ? Color.green : Color.secondary)
                    .symbolEffect(.bounce, value: player.showQueue)
            }
            .buttonStyle(.plain)
            .help("View Queue")
            .disabled(player.queue.isEmpty)

            // EQ button
            Button {
                showEqualizer = true
            } label: {
                Image(systemName: "slider.vertical.3")
                    .font(.system(size: 14))
                    .foregroundStyle(EqualizerService.shared.isEnabled ? Color.green : Color.secondary)
            }
            .buttonStyle(.plain)
            .help("Equalizer")
            .sheet(isPresented: $showEqualizer) {
                EqualizerView()
            }

            // Open in Spotify button
            if let url = player.currentTrack?.spotifyURL {
                Link(destination: url) {
                    Image(systemName: "arrow.up.right.circle")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .help("Open in Spotify")
            }
        }
    }
}

// MARK: - Custom Slider

struct PlayerSliderView: View {
    @Binding var value: Double
    var onSeek: ((Double) -> Void)?
    @State private var isHovering = false
    @State private var isDragging = false

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            ZStack(alignment: .leading) {
                // Track bg
                Capsule()
                    .fill(Color.primary.opacity(0.12))
                    .frame(height: isDragging || isHovering ? 5 : 3)

                // Filled
                Capsule()
                    .fill(isDragging || isHovering ? Color.green : Color.green.opacity(0.85))
                    .frame(width: max(0, CGFloat(value) * w), height: isDragging || isHovering ? 5 : 3)

                // Thumb
                if isDragging || isHovering {
                    Circle()
                        .fill(.white)
                        .frame(width: 13, height: 13)
                        .shadow(color: .black.opacity(0.25), radius: 3, x: 0, y: 1)
                        .offset(x: max(0, CGFloat(value) * w - 6.5))
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .frame(height: 13)
            .contentShape(Rectangle())
            .platformHover(isHovered: $isHovering)
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { drag in
                        isDragging = true
                        value = min(1, max(0, Double(drag.location.x / w)))
                    }
                    .onEnded { drag in
                        isDragging = false
                        let v = min(1, max(0, Double(drag.location.x / w)))
                        value = v
                        onSeek?(v)
                    }
            )
        }
        .frame(height: 13)
        .animation(.easeInOut(duration: 0.1), value: isHovering)
        .animation(.easeInOut(duration: 0.1), value: isDragging)
    }
}

#Preview {
    PlayerControlsView()
        .environmentObject(PlayerCore())
        .frame(height: 86)
}
