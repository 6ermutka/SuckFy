import SwiftUI

enum SidebarItem: String, CaseIterable, Identifiable {
    case home      = "Home"
    case search    = "Search"
    case library   = "Library"
    case likedSongs = "Liked Songs"
    case settings  = "Settings"

    var id: String { rawValue }
    
    var localizedName: String {
        tr(rawValue)
    }

    var icon: String {
        switch self {
        case .home:       return "house.fill"
        case .search:     return "magnifyingglass"
        case .library:    return "music.note.list"
        case .likedSongs: return "heart.fill"
        case .settings:   return "gear"
        }
    }
}

struct SidebarView: View {
    @Binding var selectedItem: SidebarItem
    @Binding var selectedPlaylist: Playlist?
    @EnvironmentObject var player: PlayerCore
    @ObservedObject private var library = LibraryManager.shared
    @ObservedObject private var localization = LocalizationService.shared
    @AppStorage("colorScheme") private var colorSchemePref: String = "dark"
    @AppStorage("sidebarCollapsed") private var isCollapsed: Bool = false

    // Create playlist
    @State private var showCreatePlaylist = false
    @State private var newPlaylistName = ""
    @State private var editingPlaylist: Playlist?
    @State private var showEditSheet = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Logo + collapse button
            HStack(spacing: 8) {
                Image(systemName: "music.note.house.fill")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(
                        LinearGradient(colors: [.green, .mint], startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                
                if !isCollapsed {
                    Text("SuckFy")
                        .font(.system(size: 18, weight: .bold))
                    
                    Spacer()
                    
                    Button {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                            isCollapsed.toggle()
                        }
                    } label: {
                        Image(systemName: "sidebar.left")
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                    .help("Collapse Sidebar")
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 20)
            .padding(.bottom, 20)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(Rectangle())
            .onTapGesture {
                if isCollapsed {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        isCollapsed = false
                    }
                }
            }

            // Nav items
            VStack(alignment: .leading, spacing: 1) {
                ForEach(SidebarItem.allCases) { item in
                    SidebarNavItem(item: item, isSelected: selectedItem == item, isCollapsed: isCollapsed)
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
            if !isCollapsed {
                Button {
                    showCreatePlaylist = true
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(.green)
                        Text(tr("Create Playlist"))
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 10)
                }
                .buttonStyle(.plain)
                .padding(.top, 6)
            }

            if !isCollapsed {
                Divider()
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)

                // Playlists section
                Text(tr("PLAYLISTS"))
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.tertiary)
                    .tracking(0.8)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 6)
            }

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 1) {
                    // Liked Songs shortcut
                    if !library.likedSongs.isEmpty {
                        SidebarPlaylistRow(
                            name: tr("Liked Songs"),
                            subtitle: "\(library.likedSongs.count) \(tr("songs"))",
                            artworkURL: nil,
                            iconName: "heart.fill",
                            iconColor: .purple,
                            isCollapsed: isCollapsed
                        ) {
                            selectedItem = .likedSongs
                            selectedPlaylist = nil
                        }
                    }
                    // User playlists
                    ForEach(library.playlists) { playlist in
                        SidebarPlaylistRow(
                            name: playlist.name,
                            subtitle: "\(playlist.tracks.count) \(tr("songs"))",
                            artworkURL: playlist.artworkURL,
                            iconName: "music.note.list",
                            iconColor: .blue,
                            isCollapsed: isCollapsed,
                            playlistID: playlist.id,
                            onEdit: {
                                editingPlaylist = playlist
                                showEditSheet = true
                            },
                            onDelete: {
                                library.removePlaylist(playlist)
                            }
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
            if !isCollapsed {
                Divider().padding(.horizontal, 16).opacity(0.4)
                HStack(spacing: 8) {
                    Image(systemName: colorSchemePref == "dark" ? "moon.fill" : "sun.max.fill")
                        .font(.system(size: 13))
                        .foregroundStyle(colorSchemePref == "dark" ? .indigo : .orange)
                    Text(tr(colorSchemePref == "dark" ? "Dark" : "Light"))
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
        }
        .frame(width: isCollapsed ? 70 : 220)
        .background(.ultraThinMaterial)
        .sheet(isPresented: $showCreatePlaylist) {
            CreatePlaylistSheet(isPresented: $showCreatePlaylist)
        }
        .sheet(item: $editingPlaylist) { playlist in
            EditPlaylistSheet(
                isPresented: Binding(
                    get: { editingPlaylist != nil },
                    set: { if !$0 { editingPlaylist = nil } }
                ),
                playlist: playlist
            )
        }
    }
}

// MARK: - Sidebar Nav Item
struct SidebarNavItem: View {
    let item: SidebarItem
    let isSelected: Bool
    let isCollapsed: Bool

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: item.icon)
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(isSelected ? Color.green : .secondary)
                .frame(width: 22)
            
            if !isCollapsed {
                Text(item.localizedName)
                    .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? .primary : .secondary)
                Spacer()
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isSelected ? Color.primary.opacity(0.08) : Color.clear)
        )
        .contentShape(Rectangle())
        .help(isCollapsed ? item.rawValue : "")
    }
}

// MARK: - Sidebar Playlist Row
struct SidebarPlaylistRow: View {
    let name: String
    let subtitle: String
    let artworkURL: URL?
    let iconName: String
    let iconColor: Color
    let isCollapsed: Bool
    var playlistID: String? = nil
    var onEdit: (() -> Void)? = nil
    var onDelete: (() -> Void)? = nil
    let action: () -> Void
    @State private var isHovered = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                // Use ArtworkView for proper caching and custom artwork support
                ZStack {
                    if let url = artworkURL, let playlistID = playlistID {
                        ArtworkView(url: url, size: 36, cornerRadius: 5, trackID: playlistID, editable: false)
                            .id("\(playlistID)-\(name)")  // Force refresh when name changes
                    } else if let playlistID = playlistID {
                        ArtworkView(url: nil, size: 36, cornerRadius: 5, trackID: playlistID, editable: false)
                            .id("\(playlistID)-\(name)")
                    } else {
                        placeholderIcon
                            .frame(width: 36, height: 36)
                            .clipShape(RoundedRectangle(cornerRadius: 5))
                    }
                }
                .frame(width: 36, height: 36)

                if !isCollapsed {
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
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(RoundedRectangle(cornerRadius: 8).fill(isHovered ? Color.primary.opacity(0.06) : Color.clear))
        }
        .buttonStyle(.plain)
        .platformHover(isHovered: $isHovered)
        .contextMenu {
            if let onEdit = onEdit {
                Button {
                    onEdit()
                } label: {
                    Label("Edit Playlist", systemImage: "pencil")
                }
            }
            
            if let onDelete = onDelete {
                Divider()
                Button(role: .destructive) {
                    onDelete()
                } label: {
                    Label("Delete Playlist", systemImage: "trash")
                }
            }
        }
        .help(isCollapsed ? name : "")
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

// MARK: - Edit Playlist Sheet
struct EditPlaylistSheet: View {
    @Binding var isPresented: Bool
    let playlist: Playlist
    @ObservedObject private var library = LibraryManager.shared
    @State private var playlistName = ""
    @State private var playlistDescription = ""
    @State private var showImagePicker = false
    @State private var selectedImageURL: URL?
    @ObservedObject private var artworkCache = ArtworkCacheService.shared

    var body: some View {
        VStack(spacing: 20) {
            // Header with icon
            HStack(spacing: 10) {
                Image(systemName: "pencil.circle.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(.green)
                Text("Edit Playlist")
                    .font(.system(size: 18, weight: .bold))
            }

            // Artwork
            VStack(spacing: 8) {
                Group {
                    if let customArtwork = artworkCache.getCustomArtwork(for: playlist.id) {
                        #if os(macOS)
                        if let nsImage = NSImage(contentsOf: customArtwork) {
                            Image(nsImage: nsImage)
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } else {
                            placeholderArtwork
                        }
                        #elseif os(iOS)
                        if let uiImage = UIImage(contentsOfFile: customArtwork.path) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } else {
                            placeholderArtwork
                        }
                        #endif
                    } else if let url = playlist.artworkURL {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let img):
                                img.resizable().aspectRatio(contentMode: .fill)
                            case .failure(_):
                                placeholderArtwork
                            case .empty:
                                ProgressView()
                            @unknown default:
                                placeholderArtwork
                            }
                        }
                    } else {
                        placeholderArtwork
                    }
                }
                .frame(width: 120, height: 120)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.primary.opacity(0.1), lineWidth: 1)
                )
                
                Button {
                    showImagePicker = true
                } label: {
                    Label("Change Artwork", systemImage: "photo")
                        .font(.system(size: 12))
                }
                .buttonStyle(.bordered)
            }

            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Name")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.secondary)
                    TextField("Playlist Name", text: $playlistName)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 360)
                }
                
                VStack(alignment: .leading, spacing: 6) {
                    Text("Description")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.secondary)
                    TextField("Description", text: $playlistDescription)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 360)
                }
            }

            HStack(spacing: 12) {
                Button("Cancel") { isPresented = false }
                    .buttonStyle(.bordered)
                    .keyboardShortcut(.cancelAction)

                Button("Save") { saveChanges() }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    .keyboardShortcut(.defaultAction)
                    .disabled(playlistName.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
        .padding(32)
        .frame(width: 480)
        .fileImporter(
            isPresented: $showImagePicker,
            allowedContentTypes: [.image],
            allowsMultipleSelection: false
        ) { result in
            if case .success(let urls) = result, let url = urls.first {
                print("🖼️ Setting custom artwork for playlist: \(playlist.id)")
                print("📁 Image URL: \(url)")
                artworkCache.setCustomArtwork(for: playlist.id, imageURL: url)
                print("✅ Custom artwork set, checking...")
                if artworkCache.hasCustomArtwork(for: playlist.id) {
                    print("✅ Verified: Custom artwork exists for \(playlist.id)")
                } else {
                    print("❌ Error: Custom artwork NOT found after setting!")
                }
            }
        }
        .onAppear {
            playlistName = playlist.name
            playlistDescription = playlist.description
        }
    }

    private func saveChanges() {
        print("💾 Saving playlist changes...")
        let trimmedName = playlistName.trimmingCharacters(in: .whitespaces)
        let trimmedDesc = playlistDescription.trimmingCharacters(in: .whitespaces)
        
        // Use the library method to update and save
        library.updatePlaylist(playlist.id, name: trimmedName, description: trimmedDesc)
        print("✅ Playlist updated: \(trimmedName)")
        
        isPresented = false
    }
    
    private var placeholderArtwork: some View {
        RoundedRectangle(cornerRadius: 0)
            .fill(Color.blue.opacity(0.3))
            .overlay {
                Image(systemName: "music.note.list")
                    .font(.system(size: 40))
                    .foregroundStyle(.white)
            }
    }
}

// MARK: - Create Playlist Sheet
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
