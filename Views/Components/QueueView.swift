import SwiftUI

struct QueueView: View {
    @EnvironmentObject var player: PlayerCore
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Queue")
                    .font(.system(size: 18, weight: .bold))
                
                Spacer()
                
                // Shuffle and repeat indicators
                HStack(spacing: 12) {
                    if player.isShuffle {
                        Image(systemName: "shuffle")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.green)
                    }
                    
                    if player.repeatMode != .off {
                        Image(systemName: player.repeatMode == .one ? "repeat.1" : "repeat")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.green)
                    }
                }
                
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        player.showQueue = false
                    }
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .symbolRenderingMode(.hierarchical)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .help("Close Queue")
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            
            Divider()
            
            VStack(spacing: 0) {
                // Current track section
                if let currentTrack = player.currentTrack {
                    VStack(spacing: 12) {
                        Text("Now Playing")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.secondary)
                            .tracking(1)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        
                        currentTrackCard(currentTrack)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    
                    Divider()
                }
                
                // Upcoming tracks
                ScrollView {
                    LazyVStack(spacing: 1) {
                        if upcomingTracks.isEmpty {
                            VStack(spacing: 12) {
                                Image(systemName: "music.note.list")
                                    .font(.system(size: 40, weight: .light))
                                    .foregroundStyle(.quaternary)
                                Text("No upcoming tracks")
                                    .font(.system(size: 14))
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.top, 60)
                        } else {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Next in Queue")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(.secondary)
                                    .tracking(1)
                                    .padding(.horizontal, 16)
                                    .padding(.top, 12)
                                
                                ForEach(Array(upcomingTracks.enumerated()), id: \.element.id) { index, track in
                                    QueueTrackRow(track: track, index: index + 1)
                                        .contentShape(Rectangle())
                                        .onTapGesture {
                                            // Jump to this track
                                            player.play(track, in: player.currentPlaylist)
                                        }
                                }
                            }
                        }
                    }
                    .padding(.bottom, 16)
                }
                .scrollIndicators(.hidden)
            }
        }
        .background(.ultraThinMaterial)
    }
    
    private var upcomingTracks: [Track] {
        guard let currentTrack = player.currentTrack else {
            return player.getDisplayQueue()
        }
        
        // Get the display queue (shuffle order if shuffle is on)
        let displayQueue = player.getDisplayQueue()
        
        // Find current track in display queue
        guard let currentIndex = displayQueue.firstIndex(of: currentTrack) else {
            return displayQueue.filter { $0.id != currentTrack.id }
        }
        
        // Return tracks after current in the display order
        let nextIndex = currentIndex + 1
        if nextIndex < displayQueue.count {
            return Array(displayQueue[nextIndex...])
        }
        return []
    }
    
    private func currentTrackCard(_ track: Track) -> some View {
        HStack(spacing: 12) {
            ArtworkView(url: track.artworkURL, size: 60, cornerRadius: 8, trackID: track.id)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(track.title)
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)
                
                Text(track.artist)
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                
                Text(track.album)
                    .font(.system(size: 12))
                    .foregroundStyle(.tertiary)
                    .lineLimit(1)
            }
            
            Spacer()
            
            // Animated playing indicator
            if player.isPlaying {
                PlayingIndicator()
                    .frame(width: 16, height: 16)
            }
        }
        .padding(12)
        .background(Color.green.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
    }
}

struct QueueTrackRow: View {
    let track: Track
    let index: Int
    @State private var isHovered = false
    
    var body: some View {
        HStack(spacing: 12) {
            // Index number
            Text("\(index)")
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .foregroundStyle(.tertiary)
                .frame(width: 24, alignment: .trailing)
            
            ArtworkView(url: track.artworkURL, size: 44, cornerRadius: 6, trackID: track.id)
            
            VStack(alignment: .leading, spacing: 3) {
                Text(track.title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.primary)
                    .lineLimit(1)
                
                Text(track.artist)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            
            Spacer()
            
            Text(track.durationFormatted)
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(.tertiary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(isHovered ? Color.primary.opacity(0.05) : Color.clear)
        .onHover { isHovered = $0 }
    }
}

struct PlayingIndicator: View {
    @State private var heights: [CGFloat] = [0.3, 0.6, 0.9]
    
    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<3) { i in
                RoundedRectangle(cornerRadius: 1)
                    .fill(Color.green)
                    .frame(width: 3)
                    .scaleEffect(y: heights[i], anchor: .bottom)
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true)) {
                heights = [0.9, 0.3, 0.6]
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                withAnimation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true)) {
                    heights = [0.6, 0.9, 0.3]
                }
            }
        }
    }
}

#Preview {
    QueueView()
        .environmentObject(PlayerCore())
        .frame(width: 320, height: 500)
}
