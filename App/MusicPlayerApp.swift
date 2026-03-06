import SwiftUI

@main
struct DotifyApp: App {
    @StateObject private var player = PlayerCore()
    @AppStorage("colorScheme") private var colorSchemePref: String = "dark"

    var preferredScheme: ColorScheme? {
        switch colorSchemePref {
        case "dark": return .dark
        case "light": return .light
        default: return nil
        }
    }

    var body: some Scene {
        // Main window — macOS Sequoia style: hidden title bar with vibrancy
        Window("SuckFy", id: "main") {
            MainView()
                .environmentObject(player)
                .frame(minWidth: 880, minHeight: 580)
                .preferredColorScheme(preferredScheme)
        }
        .windowStyle(.hiddenTitleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
        .defaultSize(width: 1100, height: 700)
        .commands {
            CommandGroup(replacing: .newItem) {}
            CommandMenu("Playback") {
                Button(player.isPlaying ? "Pause" : "Play") { player.playPause() }
                    .keyboardShortcut(" ", modifiers: [])
                Button("Next Track") { player.next() }
                    .keyboardShortcut(.rightArrow, modifiers: .command)
                Button("Previous Track") { player.previous() }
                    .keyboardShortcut(.leftArrow, modifiers: .command)
                Divider()
                Button("Toggle Shuffle") { player.toggleShuffle() }
                    .keyboardShortcut("s", modifiers: .command)
                Button("Toggle Repeat") { player.toggleRepeat() }
                    .keyboardShortcut("r", modifiers: .command)
            }
        }

        // Menu Bar Extra
        MenuBarExtra {
            MenuBarPlayerView()
                .environmentObject(player)
        } label: {
            Image(systemName: player.isPlaying ? "music.note" : "music.note.slash")
                .symbolEffect(.pulse, isActive: player.isPlaying)
        }
        .menuBarExtraStyle(.window)
    }
}
