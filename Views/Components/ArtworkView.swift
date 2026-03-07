import SwiftUI

struct ArtworkView: View {
    let url: URL?
    let size: CGFloat
    var cornerRadius: CGFloat = 8
    var trackID: String? = nil
    var editable: Bool = false
    
    @StateObject private var cache = ArtworkCacheService.shared
    @State private var cachedImage: NSImage?
    @State private var isLoading = false
    @State private var showImagePicker = false
    
    var body: some View {
        Group {
            if let trackID = trackID, let customURL = cache.getCustomArtwork(for: trackID) {
                // Show custom artwork
                if let nsImage = NSImage(contentsOf: customURL) {
                    Image(nsImage: nsImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } else {
                    placeholderView
                }
            } else if let cachedImage = cachedImage {
                // Show cached image
                Image(nsImage: cachedImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else if isLoading {
                ProgressView()
                    .frame(width: size, height: size)
            } else {
                placeholderView
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
        .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
        .overlay(alignment: .bottomTrailing) {
            if editable {
                editButton
            }
        }
        .fileImporter(
            isPresented: $showImagePicker,
            allowedContentTypes: [.image],
            allowsMultipleSelection: false
        ) { result in
            handleImageSelection(result)
        }
        .task(id: url) {
            await loadArtwork()
        }
        .onChange(of: cache.customArtwork) { _ in
            // Refresh when custom artwork changes
            print("🔄 Custom artwork changed, reloading for trackID: \(trackID ?? "nil")")
            cachedImage = nil
            Task { await loadArtwork() }
        }
        .task(id: trackID) {
            // Reload when trackID changes
            await loadArtwork()
        }
    }
    
    private var editButton: some View {
        Menu {
            Button {
                showImagePicker = true
            } label: {
                Label("Change Artwork", systemImage: "photo")
            }
            
            if let trackID = trackID, cache.hasCustomArtwork(for: trackID) {
                Button(role: .destructive) {
                    cache.removeCustomArtwork(for: trackID)
                } label: {
                    Label("Reset to Original", systemImage: "arrow.counterclockwise")
                }
            }
        } label: {
            Image(systemName: "pencil.circle.fill")
                .font(.system(size: size * 0.2))
                .foregroundStyle(.white)
                .background(
                    Circle()
                        .fill(Color.black.opacity(0.5))
                        .frame(width: size * 0.25, height: size * 0.25)
                )
                .padding(size * 0.08)
        }
        .menuStyle(.borderlessButton)
        .menuIndicator(.hidden)
        .help("Edit Artwork")
    }

    private var placeholderView: some View {
        ZStack {
            LinearGradient(
                colors: [Color.purple.opacity(0.6), Color.blue.opacity(0.6)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            Image(systemName: "music.note")
                .font(.system(size: size * 0.35))
                .foregroundStyle(.white.opacity(0.8))
        }
    }
    
    private func loadArtwork() async {
        // Check for custom artwork first - if exists, don't load from URL
        if let trackID = trackID {
            if cache.hasCustomArtwork(for: trackID) {
                print("✅ Found custom artwork for: \(trackID)")
                cachedImage = nil  // Clear cache to force showing custom artwork
                return
            } else {
                print("ℹ️ No custom artwork for: \(trackID)")
            }
        }
        
        guard let url = url else {
            cachedImage = nil
            return
        }
        
        isLoading = true
        
        // Try to load from cache or download
        if let data = await cache.downloadAndCache(url: url),
           let nsImage = NSImage(data: data) {
            await MainActor.run {
                cachedImage = nsImage
                isLoading = false
            }
        } else {
            await MainActor.run {
                cachedImage = nil
                isLoading = false
            }
        }
    }
    
    private func handleImageSelection(_ result: Result<[URL], Error>) {
        guard let trackID = trackID else { return }
        
        switch result {
        case .success(let urls):
            if let url = urls.first {
                cache.setCustomArtwork(for: trackID, imageURL: url)
            }
        case .failure(let error):
            print("Failed to select image: \(error)")
        }
    }
}
