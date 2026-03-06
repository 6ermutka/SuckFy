import SwiftUI

enum SidebarItem: String, CaseIterable, Identifiable {
    case home      = "Home"
    case search    = "Search"
    case library   = "Library"
    case likedSongs = "Liked Songs"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .home:       return "house.fill"
        case .search:     return "magnifyingglass"
        case .library:    return "music.note.list"
        case .likedSongs: return "heart.fill"
        }
    }
}

struct SidebarView: View {
    @Binding var selectedItem: SidebarItem
    @EnvironmentObject var player: PlayerCore
    @ObservedObject private var library = LibraryManager.shared
    @AppStorage("colorScheme") private var colorSchemePref: String = "dark"

    // Spotify URL import
    @State private var showImportSheet = false
    @State private var importURL = ""
    @State private var importError: String?
    @State private var isImporting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Logo
            HStack(spacing: 8) {
                Image(systemName: "music.note.house.fill")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(
                        LinearGradient(colors: [.green, .mint], startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                Text("SuckFy")
                    .font(.system(size: 18, weight: .bold))
            }
            .padding(.horizontal, 18)
            .padding(.top, 20)
            .padding(.bottom, 20)

            // Nav items
            VStack(alignment: .leading, spacing: 1) {
                ForEach(SidebarItem.allCases) { item in
                    SidebarNavItem(item: item, isSelected: selectedItem == item)
                        .onTapGesture { withAnimation(.easeInOut(duration: 0.15)) { selectedItem = item } }
                }
            }
            .padding(.horizontal, 8)

            // Import playlist button
            Button {
                showImportSheet = true
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(.green)
                    Text("Import Playlist")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 10)
            }
            .buttonStyle(.plain)
            .padding(.top, 6)

            Divider()
                .padding(.horizontal, 16)
                .padding(.vertical, 12)

            // Playlists section
            Text("PLAYLISTS")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.tertiary)
                .tracking(0.8)
                .padding(.horizontal, 20)
                .padding(.bottom, 6)

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 1) {
                    // Liked Songs shortcut
                    if !library.likedSongs.isEmpty {
                        SidebarPlaylistRow(
                            name: "Liked Songs",
                            subtitle: "\(library.likedSongs.count) songs",
                            artworkURL: nil,
                            iconName: "heart.fill",
                            iconColor: .purple
                        ) { selectedItem = .likedSongs }
                    }
                    // User playlists
                    ForEach(library.playlists) { playlist in
                        SidebarPlaylistRow(
                            name: playlist.name,
                            subtitle: "\(playlist.tracks.count) songs",
                            artworkURL: playlist.artworkURL,
                            iconName: "music.note.list",
                            iconColor: .blue
                        ) {}
                    }
                }
                .padding(.horizontal, 8)
            }

            Spacer()

            // Theme toggle
            Divider().padding(.horizontal, 16).opacity(0.4)
            HStack(spacing: 8) {
                Image(systemName: colorSchemePref == "dark" ? "moon.fill" : "sun.max.fill")
                    .font(.system(size: 13))
                    .foregroundStyle(colorSchemePref == "dark" ? .indigo : .orange)
                Text(colorSchemePref == "dark" ? "Dark" : "Light")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
                Spacer()
                Toggle("", isOn: Binding(
                    get: { colorSchemePref == "dark" },
                    set: { colorSchemePref = $0 ? "dark" : "light" }
                ))
                .toggleStyle(.switch)
                .scaleEffect(0.8)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .frame(width: 220)
        .background(.ultraThinMaterial)
        .sheet(isPresented: $showImportSheet) {
            ImportPlaylistSheet(isPresented: $showImportSheet)
                .environmentObject(player)
        }
    }
}

// MARK: - Sidebar Nav Item
struct SidebarNavItem: View {
    let item: SidebarItem
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: item.icon)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(isSelected ? Color.green : .secondary)
                .frame(width: 22)
            Text(item.rawValue)
                .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? .primary : .secondary)
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isSelected ? Color.primary.opacity(0.08) : Color.clear)
        )
        .contentShape(Rectangle())
    }
}

// MARK: - Sidebar Playlist Row
struct SidebarPlaylistRow: View {
    let name: String
    let subtitle: String
    let artworkURL: URL?
    let iconName: String
    let iconColor: Color
    let action: () -> Void
    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Group {
                    if let url = artworkURL {
                        AsyncImage(url: url) { img in
                            img.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            placeholderIcon
                        }
                    } else {
                        placeholderIcon
                    }
                }
                .frame(width: 36, height: 36)
                .clipShape(RoundedRectangle(cornerRadius: 5))

                VStack(alignment: .leading, spacing: 2) {
                    Text(name)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(RoundedRectangle(cornerRadius: 8).fill(isHovered ? Color.primary.opacity(0.06) : Color.clear))
        }
        .buttonStyle(.plain)
        .onHover { isHovered = $0 }
    }

    private var placeholderIcon: some View {
        ZStack {
            LinearGradient(colors: [iconColor.opacity(0.7), iconColor.opacity(0.4)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
            Image(systemName: iconName)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(.white)
        }
    }
}

// MARK: - Import Playlist Sheet
struct ImportPlaylistSheet: View {
    @Binding var isPresented: Bool
    @EnvironmentObject var player: PlayerCore
    @ObservedObject private var library = LibraryManager.shared
    @State private var urlText = ""
    @State private var isLoading = false
    @State private var errorMsg: String?

    var body: some View {
        VStack(spacing: 20) {
            Text("Import Spotify Playlist")
                .font(.system(size: 18, weight: .bold))

            Text("Paste a Spotify playlist, album or track URL")
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            TextField("https://open.spotify.com/playlist/...", text: $urlText)
                .textFieldStyle(.roundedBorder)
                .frame(width: 380)

            if let err = errorMsg {
                Text(err)
                    .font(.system(size: 12))
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
            }

            HStack(spacing: 12) {
                Button("Cancel") { isPresented = false }
                    .buttonStyle(.bordered)
                    .keyboardShortcut(.cancelAction)

                Button("Import") { importURL() }
                    .buttonStyle(.borderedProminent)
                    .keyboardShortcut(.defaultAction)
                    .disabled(urlText.trimmingCharacters(in: .whitespaces).isEmpty || isLoading)
            }

            if isLoading {
                ProgressView("Importing…")
                    .progressViewStyle(.linear)
                    .frame(width: 380)
            }
        }
        .padding(28)
        .frame(width: 440)
    }

    private func importURL() {
        let raw = urlText.trimmingCharacters(in: .whitespaces)
        isLoading = true; errorMsg = nil
        Task {
            do {
                // Detect type
                if raw.contains("/playlist/") {
                    let id = extractID(from: raw)
                    guard !id.isEmpty else { throw ImportError.invalidURL }
                    let sp = try await SpotifyService.shared.playlist(id: id)
                    let tracks = sp.tracks.items.compactMap(\.track).map { Track(from: $0) }
                    let playlist = Playlist(id: sp.id, name: sp.name,
                                           description: sp.description ?? "",
                                           artworkURL: sp.images.first.flatMap { URL(string: $0.url) },
                                           tracks: tracks)
                    await MainActor.run { library.addPlaylist(playlist); isPresented = false }
                } else if raw.contains("/track/") {
                    let id = extractID(from: raw)
                    guard !id.isEmpty else { throw ImportError.invalidURL }
                    let sp = try await SpotifyService.shared.track(id: id)
                    let track = Track(from: sp)
                    await MainActor.run { player.play(track); isPresented = false }
                } else {
                    throw ImportError.invalidURL
                }
            } catch {
                await MainActor.run { errorMsg = error.localizedDescription; isLoading = false }
            }
        }
    }

    private func extractID(from url: String) -> String {
        guard let u = URL(string: url) else { return "" }
        return u.lastPathComponent.components(separatedBy: "?").first ?? ""
    }
}

enum ImportError: LocalizedError {
    case invalidURL
    var errorDescription: String? { "Invalid Spotify URL. Please paste a valid track or playlist link." }
}

// MARK: - Color hex helper
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:  (a,r,g,b) = (255,(int>>8)*17,(int>>4&0xF)*17,(int&0xF)*17)
        case 6:  (a,r,g,b) = (255,int>>16,int>>8&0xFF,int&0xFF)
        case 8:  (a,r,g,b) = (int>>24,int>>16&0xFF,int>>8&0xFF,int&0xFF)
        default: (a,r,g,b) = (255,0,0,0)
        }
        self.init(.sRGB, red: Double(r)/255, green: Double(g)/255, blue: Double(b)/255, opacity: Double(a)/255)
    }
}
