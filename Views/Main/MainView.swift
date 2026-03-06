import SwiftUI

struct MainView: View {
    @EnvironmentObject var player: PlayerCore
    @StateObject private var library = LibraryManager.shared
    @State private var selectedItem: SidebarItem = .home

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                // Sidebar
                SidebarView(selectedItem: $selectedItem)

                // Divider
                Divider().opacity(0.4)

                // Content Area
                ZStack {
                    // Background — use system window material
                    Rectangle()
                        .fill(.background)
                        .ignoresSafeArea()

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
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Download error banner
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

            // Bottom player bar
            PlayerControlsView()
        }
        .background(.ultraThickMaterial)
    }
}

// MARK: - Library View (playlists)
struct LibraryView: View {
    @EnvironmentObject var library: LibraryManager
    @EnvironmentObject var player: PlayerCore

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Your Library")
                .font(.system(size: 28, weight: .bold))
                .padding(.horizontal, 24)
                .padding(.top, 28)
                .padding(.bottom, 20)

            if library.playlists.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "music.note.list")
                        .font(.system(size: 52, weight: .light))
                        .foregroundStyle(.quaternary)
                    Text("No playlists yet")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(.secondary)
                    Text("Import a Spotify playlist URL from the sidebar")
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(library.playlists) { playlist in
                            PlaylistRow(playlist: playlist)
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .scrollIndicators(.hidden)
            }
        }
    }
}

struct PlaylistRow: View {
    let playlist: Playlist
    @State private var isHovered = false

    var body: some View {
        HStack(spacing: 14) {
            ArtworkView(url: playlist.artworkURL, size: 52, cornerRadius: 6)
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
        .onHover { isHovered = $0 }
    }
}

// MARK: - Liked Songs View
struct LikedSongsView: View {
    @EnvironmentObject var library: LibraryManager
    @EnvironmentObject var player: PlayerCore
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
                    Text("PLAYLIST").font(.system(size: 11, weight: .semibold)).foregroundStyle(.secondary).tracking(1)
                    Text("Liked Songs").font(.system(size: 36, weight: .bold))
                    Text("\(library.likedSongs.count) songs")
                        .font(.system(size: 13)).foregroundStyle(.secondary)
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
                    Text("No liked songs yet")
                        .font(.system(size: 16, weight: .semibold)).foregroundStyle(.secondary)
                    Text("Tap ♥ on any track to save it here")
                        .font(.system(size: 13)).foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 2) {
                        ForEach(Array(library.likedSongs.enumerated()), id: \.element.id) { i, track in
                            TrackListRow(track: track, index: i, isHovered: hoveredId == track.id)
                                .onHover { hoveredId = $0 ? track.id : nil }
                                .onTapGesture(count: 2) {
                                    player.play(track)
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

            ArtworkView(url: track.artworkURL, size: 40, cornerRadius: 4)

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
