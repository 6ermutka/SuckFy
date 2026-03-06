import SwiftUI

struct ControlButton: View {
    let icon: String
    let color: Color
    let size: CGFloat
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: size, weight: .semibold))
                .foregroundStyle(color)
        }
        .buttonStyle(.plain)
    }
}

struct MenuBarPlayerView: View {
    @EnvironmentObject var player: PlayerCore
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        VStack(spacing: 0) {
            // Artwork + Track Info
            HStack(spacing: 12) {
                ArtworkView(url: player.currentTrack?.artworkURL, size: 52, cornerRadius: 8)

                VStack(alignment: .leading, spacing: 3) {
                    if let track = player.currentTrack {
                        HStack(spacing: 5) {
                            Circle()
                                .fill(Color(hex: "1DB954"))
                                .frame(width: 5, height: 5)
                            Text("Spotify")
                                .font(.system(size: 10))
                                .foregroundStyle(.white.opacity(0.4))
                        }
                        Text(track.title)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                        Text(track.artist)
                            .font(.system(size: 11))
                            .foregroundStyle(.white.opacity(0.5))
                            .lineLimit(1)
                    } else {
                        Text("Nothing playing")
                            .font(.system(size: 13))
                            .foregroundStyle(.white.opacity(0.4))
                    }
                }
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 12)

            // Progress bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color.white.opacity(0.15))
                        .frame(height: 3)
                    RoundedRectangle(cornerRadius: 2)
                        .fill(Color(hex: "1DB954"))
                        .frame(width: geo.size.width * player.progress, height: 3)
                }
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onEnded { val in
                            player.seek(to: val.location.x / geo.size.width)
                        }
                )
            }
            .frame(height: 3)
            .padding(.horizontal, 16)
            .padding(.bottom, 6)

            // Time labels
            HStack {
                Text(player.currentTimeFormatted)
                Spacer()
                Text(player.remainingTimeFormatted)
            }
            .font(.system(size: 10, design: .monospaced))
            .foregroundStyle(.white.opacity(0.35))
            .padding(.horizontal, 16)
            .padding(.bottom, 12)

            Divider().background(Color.white.opacity(0.08))

            // Controls
            HStack(spacing: 32) {
                ControlButton(icon: "shuffle",
                              color: player.isShuffle ? Color(hex: "1DB954") : .white.opacity(0.5),
                              size: 14) {
                    player.toggleShuffle()
                }

                ControlButton(icon: "backward.fill", color: .white, size: 18) {
                    player.previous()
                }

                Button {
                    player.playPause()
                } label: {
                    ZStack {
                        Circle()
                            .fill(.white)
                            .frame(width: 40, height: 40)
                        Image(systemName: player.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.black)
                    }
                }
                .buttonStyle(.plain)

                ControlButton(icon: "forward.fill", color: .white, size: 18) {
                    player.next()
                }

                ControlButton(icon: repeatIcon,
                              color: player.repeatMode == .off ? .white.opacity(0.5) : Color(hex: "1DB954"),
                              size: 14) {
                    player.toggleRepeat()
                }
            }
            .padding(.vertical, 14)

            Divider().background(Color.white.opacity(0.08))

            // Volume
            HStack(spacing: 10) {
                Image(systemName: "speaker.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.4))

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.white.opacity(0.15))
                            .frame(height: 3)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color(hex: "1DB954"))
                            .frame(width: geo.size.width * player.volume, height: 3)
                        Circle()
                            .fill(.white)
                            .frame(width: 10, height: 10)
                            .offset(x: geo.size.width * player.volume - 5)
                    }
                    .frame(height: 3)
                    .frame(maxHeight: .infinity, alignment: .center)
                    .contentShape(Rectangle())
                    .gesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { val in
                                player.volume = max(0, min(1, val.location.x / geo.size.width))
                            }
                    )
                }
                .frame(height: 16)

                Image(systemName: "speaker.wave.3.fill")
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.4))
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 12)

            Divider().background(Color.white.opacity(0.08))

            // Open main window
            Button {
                openWindow(id: "main")
            } label: {
                HStack {
                    Image(systemName: "macwindow")
                    Text("Open SuckFy")
                }
                .font(.system(size: 13))
                .foregroundStyle(.white.opacity(0.7))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
            }
            .buttonStyle(.plain)
        }
        .frame(width: 300)
        .background(Color(hex: "1a1a1a"))
    }

    private var repeatIcon: String {
        switch player.repeatMode {
        case .off: return "repeat"
        case .all: return "repeat"
        case .one: return "repeat.1"
        }
    }
}
