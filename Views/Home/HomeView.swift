import SwiftUI

struct HomeView: View {
    @EnvironmentObject var player: PlayerCore
    @EnvironmentObject var library: LibraryManager
    @ObservedObject private var localization = LocalizationService.shared
    @State private var hoveredTrackId: String?

    var greeting: String {
        let h = Calendar.current.component(.hour, from: Date())
        switch h {
        case 5..<12: return tr("Good morning")
        case 12..<17: return tr("Good afternoon")
        default: return tr("Good evening")
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 32) {
                // Greeting
                Text(greeting)
                    .font(.system(size: 30, weight: .bold))
                    .padding(.horizontal, 24)
                    .padding(.top, 28)

                // Recently Played
                if !library.recentlyPlayed.isEmpty {
                    sectionHeader(tr("Recently Played"))
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 16) {
                            ForEach(library.recentlyPlayed.prefix(10)) { track in
                                RecentTrackCard(track: track, hoveredTrackId: $hoveredTrackId)
                            }
                        }
                        .padding(.horizontal, 24)
                    }
                } else {
                    // No recent — show search prompt
                    VStack(spacing: 16) {
                        Image(systemName: "music.note.tv")
                            .font(.system(size: 52, weight: .light))
                            .foregroundStyle(.quaternary)
                        Text(tr("Search for music to get started"))
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundStyle(.secondary)
                        Text(tr("Use the Search tab to find Spotify tracks"))
                            .font(.system(size: 14))
                            .foregroundStyle(.tertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 60)
                }

                // Liked Songs quick access
                if !library.likedSongs.isEmpty {
                    sectionHeader(tr("Liked Songs"))
                    LazyVGrid(columns: [
                        GridItem(.flexible(), spacing: 12),
                        GridItem(.flexible(), spacing: 12),
                        GridItem(.flexible(), spacing: 12)
                    ], spacing: 12) {
                        ForEach(library.likedSongs.prefix(6)) { track in
                            QuickTrackTile(track: track, isHovered: hoveredTrackId == track.id)
                                .platformHover(id: track.id, hoveredID: $hoveredTrackId)
                                .onTapGesture { player.play(track) }
                        }
                    }
                    .padding(.horizontal, 24)
                }

                Spacer(minLength: 24)
            }
        }
        .scrollIndicators(.hidden)
        .background(.clear)
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(size: 20, weight: .bold))
            .padding(.horizontal, 24)
    }
}

// MARK: - Recent Track Card (horizontal scroll)
struct RecentTrackCard: View {
    let track: Track
    @Binding var hoveredTrackId: String?
    @EnvironmentObject var player: PlayerCore

    var isCurrent: Bool { player.currentTrack?.id == track.id }
    var isHovered: Bool { hoveredTrackId == track.id }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ZStack(alignment: .bottomTrailing) {
                ArtworkView(url: track.artworkURL, size: 150, trackID: track.id)
                #if os(macOS)
                if isHovered {
                    Button { player.play(track) } label: {
                        Image(systemName: isCurrent && player.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.black)
                            .frame(width: 44, height: 44)
                            .background(Color.white)
                            .clipShape(Circle())
                            .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
                    }
                    .buttonStyle(.plain)
                    .padding(8)
                    .transition(.scale.combined(with: .opacity))
                }
                #endif
            }
            .animation(.spring(response: 0.3, dampingFraction: 0.75), value: isHovered)
            .onTapGesture { player.play(track) }

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
        }
        .frame(width: 150)
        .padding(12)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(isCurrent ? Color.green.opacity(0.4) : Color.clear, lineWidth: 1.5)
        )
        .platformHover(id: track.id, hoveredID: $hoveredTrackId)
        .contentShape(Rectangle())
    }
}

// MARK: - Quick Track Tile (grid)
struct QuickTrackTile: View {
    let track: Track
    let isHovered: Bool
    @EnvironmentObject var player: PlayerCore

    var isCurrent: Bool { player.currentTrack?.id == track.id }

    var body: some View {
        HStack(spacing: 10) {
            ArtworkView(url: track.artworkURL, size: 44, cornerRadius: 6, trackID: track.id)
            VStack(alignment: .leading, spacing: 2) {
                Text(track.title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(isCurrent ? .green : .primary)
                    .lineLimit(1)
                Text(track.artist)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            Spacer()
            if isHovered {
                Image(systemName: isCurrent && player.isPlaying ? "pause.fill" : "play.fill")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
                    .transition(.opacity)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(isHovered ? Color.primary.opacity(0.07) : Color.primary.opacity(0.04))
        )
        .animation(.easeInOut(duration: 0.12), value: isHovered)
        .contentShape(Rectangle())
    }
}

#Preview {
    HomeView()
        .environmentObject(PlayerCore())
        .environmentObject(LibraryManager.shared)
        .frame(width: 800, height: 600)
}
