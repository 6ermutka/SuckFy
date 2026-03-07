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
    @Binding var selectedPlaylist: Playlist?
    @EnvironmentObject var player: PlayerCore
    @ObservedObject private var library = LibraryManager.shared
    @AppStorage("colorScheme") private var colorSchemePref: String = "dark"

    // Create playlist
    @State private var showCreatePlaylist = false
    @State private var newPlaylistName = ""

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
                        .onTapGesture {
                            withAnimation(.easeInOut(duration: 0.15)) {
                                selectedItem = item
                                selectedPlaylist = nil
                            }
                        }
                }
            }
            .padding(.horizontal, 8)

            // Create playlist button
            Button {
                showCreatePlaylist = true
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(.green)
                    Text("Create Playlist")
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
                        ) {
                            selectedItem = .likedSongs
                            selectedPlaylist = nil
                        }
                    }
                    // User playlists
                    ForEach(library.playlists) { playlist in
                        SidebarPlaylistRow(
                            name: playlist.name,
                            subtitle: "\(playlist.tracks.count) songs",
                            artworkURL: playlist.artworkURL,
                            iconName: "music.note.list",
                            iconColor: .blue
                        ) {
                            selectedPlaylist = playlist
                            selectedItem = .home // Reset sidebar selection
                        }
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
        .sheet(isPresented: $showCreatePlaylist) {
            CreatePlaylistSheet(isPresented: $showCreatePlaylist)
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
struct CreatePlaylistSheet: View {
    @Binding var isPresented: Bool
    @ObservedObject private var library = LibraryManager.shared
    @State private var playlistName = ""
    @State private var playlistDescription = ""

    var body: some View {
        VStack(spacing: 20) {
            // Header with icon
            HStack(spacing: 10) {
                Image(systemName: "music.note.list")
                    .font(.system(size: 20))
                    .foregroundStyle(.green)
                Text("Create Playlist")
                    .font(.system(size: 18, weight: .bold))
            }

            VStack(spacing: 8) {
                Text("Give your playlist a name")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Name")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.secondary)
                    TextField("My Playlist", text: $playlistName)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 360)
                }
                
                VStack(alignment: .leading, spacing: 6) {
                    Text("Description (optional)")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.secondary)
                    TextField("Add a description...", text: $playlistDescription)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 360)
                }
            }

            HStack(spacing: 12) {
                Button("Cancel") { isPresented = false }
                    .buttonStyle(.bordered)
                    .keyboardShortcut(.cancelAction)

                Button("Create") { createPlaylist() }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    .keyboardShortcut(.defaultAction)
                    .disabled(playlistName.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(32)
        .frame(width: 440)
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
        
        library.addPlaylist(playlist)
        isPresented = false
    }
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
