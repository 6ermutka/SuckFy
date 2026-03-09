import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var library: LibraryManager
    @ObservedObject private var localization = LocalizationService.shared
    @AppStorage("customCacheDirectory") private var customCachePath: String = ""
    @State private var showFolderPicker = false
    @State private var showImportPicker = false
    @State private var currentCacheSize: String = "Calculating..."
    
    var appLanguage: String {
        get { localization.currentLanguage }
        set { localization.currentLanguage = newValue }
    }
    
    var localizedStrings: [String: String] {
        if appLanguage == "ru" {
            return [
                "Settings": "Настройки",
                "Storage": "Хранилище",
                "Cache Location": "Расположение кэша",
                "Change": "Изменить",
                "Cache Size": "Размер кэша",
                "Clear Cache": "Очистить кэш",
                "Import": "Импорт",
                "Import Local Tracks": "Импорт локальных треков",
                "Add MP3, M4A, FLAC files from your computer": "Добавьте MP3, M4A, FLAC файлы с вашего компьютера",
                "Language": "Язык",
                "English": "English",
                "Russian": "Русский"
            ]
        } else {
            return [
                "Settings": "Settings",
                "Storage": "Storage",
                "Cache Location": "Cache Location",
                "Change": "Change",
                "Cache Size": "Cache Size",
                "Clear Cache": "Clear Cache",
                "Import": "Import",
                "Import Local Tracks": "Import Local Tracks",
                "Add MP3, M4A, FLAC files from your computer": "Add MP3, M4A, FLAC files from your computer",
                "Language": "Language",
                "English": "English",
                "Russian": "Русский"
            ]
        }
    }
    
    func tr(_ key: String) -> String {
        localizedStrings[key] ?? key
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                Text(tr("Settings"))
                    .font(.system(size: 32, weight: .bold))
                    .padding(.horizontal, 24)
                    .padding(.top, 28)
                
                // Language Section
                VStack(alignment: .leading, spacing: 16) {
                    Text(tr("Language"))
                        .font(.system(size: 18, weight: .semibold))
                        .padding(.horizontal, 24)
                    
                    HStack(spacing: 12) {
                        Button {
                            localization.currentLanguage = "en"
                        } label: {
                            HStack {
                                Text("🇺🇸")
                                    .font(.system(size: 20))
                                Text("English")
                                    .font(.system(size: 14, weight: appLanguage == "en" ? .semibold : .regular))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(appLanguage == "en" ? Color.green.opacity(0.2) : Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 10))
                        }
                        .buttonStyle(.plain)
                        
                        Button {
                            localization.currentLanguage = "ru"
                        } label: {
                            HStack {
                                Text("🇷🇺")
                                    .font(.system(size: 20))
                                Text("Русский")
                                    .font(.system(size: 14, weight: appLanguage == "ru" ? .semibold : .regular))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(appLanguage == "ru" ? Color.green.opacity(0.2) : Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 10))
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 24)
                }
                
                // Storage Section
                VStack(alignment: .leading, spacing: 16) {
                    Text(tr("Storage"))
                        .font(.system(size: 18, weight: .semibold))
                        .padding(.horizontal, 24)
                    
                    VStack(spacing: 12) {
                        // Current cache location
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(tr("Cache Location"))
                                    .font(.system(size: 13, weight: .medium))
                                Text(getCacheDirectory())
                                    .font(.system(size: 11))
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                                    .truncationMode(.middle)
                            }
                            Spacer()
                            Button(tr("Change")) {
                                showFolderPicker = true
                            }
                            .buttonStyle(.bordered)
                        }
                        .padding(.horizontal, 24)
                        
                        Divider().padding(.horizontal, 24)
                        
                        // Cache size
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(tr("Cache Size"))
                                    .font(.system(size: 13, weight: .medium))
                                Text(currentCacheSize)
                                    .font(.system(size: 11))
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button(tr("Clear Cache")) {
                                clearCache()
                            }
                            .buttonStyle(.bordered)
                            .tint(.red)
                        }
                        .padding(.horizontal, 24)
                    }
                    .padding(.vertical, 16)
                    .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal, 24)
                }
                
                // Import Section
                VStack(alignment: .leading, spacing: 16) {
                    Text(tr("Import"))
                        .font(.system(size: 18, weight: .semibold))
                        .padding(.horizontal, 24)
                    
                    VStack(spacing: 12) {
                        HStack {
                            Image(systemName: "arrow.down.doc.fill")
                                .font(.system(size: 24))
                                .foregroundStyle(.green)
                                .frame(width: 40)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text(tr("Import Local Tracks"))
                                    .font(.system(size: 14, weight: .semibold))
                                Text(tr("Add MP3, M4A, FLAC files from your computer"))
                                    .font(.system(size: 12))
                                    .foregroundStyle(.secondary)
                            }
                            
                            Spacer()
                            
                            Button(tr("Import")) {
                                showImportPicker = true
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding(16)
                    }
                    .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal, 24)
                }
                
                Spacer()
            }
        }
        .background(.clear)
        .fileImporter(
            isPresented: $showImportPicker,
            allowedContentTypes: [.audio],
            allowsMultipleSelection: true
        ) { result in
            handleImport(result)
        }
        .onAppear {
            calculateCacheSize()
        }
        #if os(macOS)
        .sheet(isPresented: $showFolderPicker) {
            FolderPickerView(selectedPath: $customCachePath)
        }
        #endif
    }
    
    private func getCacheDirectory() -> String {
        if !customCachePath.isEmpty {
            return customCachePath
        }
        return "~/Library/Caches/Dotify"
    }
    
    private func calculateCacheSize() {
        Task {
            let size = await getCacheSizeAsync()
            await MainActor.run {
                currentCacheSize = formatBytes(size)
            }
        }
    }
    
    private func getCacheSizeAsync() async -> Int64 {
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Dotify")
        
        guard let enumerator = FileManager.default.enumerator(at: cacheDir, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }
        
        var totalSize: Int64 = 0
        for case let fileURL as URL in enumerator {
            guard let resourceValues = try? fileURL.resourceValues(forKeys: [.fileSizeKey]),
                  let fileSize = resourceValues.fileSize else {
                continue
            }
            totalSize += Int64(fileSize)
        }
        
        return totalSize
    }
    
    private func formatBytes(_ bytes: Int64) -> String {
        let formatter = ByteCountFormatter()
        formatter.countStyle = .file
        return formatter.string(fromByteCount: bytes)
    }
    
    private func clearCache() {
        Task {
            do {
                try await DownloadService.shared.clearCache()
                await library.loadDownloadedTracks()
                calculateCacheSize()
            } catch {
                print("Failed to clear cache: \(error)")
            }
        }
    }
    
    private func handleImport(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            Task {
                await importTracks(urls)
            }
        case .failure(let error):
            print("Import failed: \(error)")
        }
    }
    
    private func importTracks(_ urls: [URL]) async {
        let cacheDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Dotify")
        
        do {
            try FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)
            
            for url in urls {
                // Use filename (without extension) as trackID to preserve name
                let filename = url.deletingPathExtension().lastPathComponent
                let ext = url.pathExtension.lowercased()
                let destURL = cacheDir.appendingPathComponent("\(filename).\(ext)")
                
                // Copy file
                if url.startAccessingSecurityScopedResource() {
                    defer { url.stopAccessingSecurityScopedResource() }
                    
                    // Check if file already exists
                    if !FileManager.default.fileExists(atPath: destURL.path) {
                        try FileManager.default.copyItem(at: url, to: destURL)
                        print("[SuckFy] Imported track: \(filename).\(ext)")
                    } else {
                        print("[SuckFy] File already exists: \(filename).\(ext)")
                    }
                }
            }
            
            // Reload library to show imported tracks
            await library.loadDownloadedTracks()
            await MainActor.run {
                calculateCacheSize()
            }
        } catch {
            print("Failed to import: \(error)")
        }
    }
}

#if os(macOS)
struct FolderPickerView: View {
    @Binding var selectedPath: String
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Select Cache Folder")
                .font(.headline)
            
            Text("Choose where to save downloaded tracks")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                
                Button("Choose Folder") {
                    chooseFolder()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(30)
        .frame(width: 400, height: 200)
    }
    
    private func chooseFolder() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.message = "Select folder for cache"
        
        if panel.runModal() == .OK, let url = panel.url {
            selectedPath = url.path
            dismiss()
        }
    }
}
#endif

#Preview {
    SettingsView()
        .environmentObject(LibraryManager.shared)
        .frame(width: 800, height: 600)
}
