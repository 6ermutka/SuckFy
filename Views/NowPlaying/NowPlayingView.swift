import SwiftUI

// NowPlayingView — shows the current playlist's track list
struct NowPlayingView: View {
    @EnvironmentObject var player: PlayerCore
    @EnvironmentObject var library: LibraryManager
    @State private var hoveredId: String?

    var playlist: Playlist? { player.currentPlaylist }

    var body: some View {
        if let playlist {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    playlistHeader(playlist)
                    Divider().opacity(0.4)
                    LazyVStack(spacing: 2) {
                        ForEach(Array(playlist.tracks.enumerated()), id: \.element.id) { i, track in
                            TrackListRow(track: track, index: i, isHovered: hoveredId == track.id)
                                .platformHover(id: track.id, hoveredID: $hoveredId)
                                .onTapGesture(count: 2) { player.play(track, in: playlist) }
                                .environmentObject(library)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                }
            }
            .scrollIndicators(.hidden)
        } else {
            VStack(spacing: 16) {
                Image(systemName: "music.note.list")
                    .font(.system(size: 52, weight: .light))
                    .foregroundStyle(.quaternary)
                Text("No Playlist Selected")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.secondary)
                Text("Import a Spotify playlist from the sidebar")
                    .font(.system(size: 13))
                    .foregroundStyle(.tertiary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func playlistHeader(_ playlist: Playlist) -> some View {
        HStack(spacing: 24) {
            ArtworkView(url: playlist.artworkURL, size: 160, cornerRadius: 12, trackID: playlist.id, editable: true)
                .id("\(playlist.id)-\(playlist.name)")  // Force refresh on changes
                .shadow(color: .black.opacity(0.2), radius: 16, x: 0, y: 8)

            VStack(alignment: .leading, spacing: 10) {
                Text("PLAYLIST")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .tracking(1)
                Text(playlist.name)
                    .font(.system(size: 36, weight: .bold))
                    .lineLimit(2)
                if !playlist.description.isEmpty {
                    Text(playlist.description)
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                HStack(spacing: 8) {
                    Label("\(playlist.tracks.count) songs", systemImage: "music.note")
                    Text("·")
                    Text(playlist.totalDurationFormatted)
                }
                .font(.system(size: 13))
                .foregroundStyle(.secondary)

                Button {
                    player.play(playlist.tracks[0], in: playlist)
                } label: {
                    Label("Play", systemImage: "play.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 8)
                        .background(Color.green, in: Capsule())
                }
                .buttonStyle(.plain)
                .disabled(playlist.tracks.isEmpty)
            }
            Spacer()
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 28)
    }
}

#Preview {
    NowPlayingView()
        .environmentObject(PlayerCore())
        .environmentObject(LibraryManager.shared)
}
