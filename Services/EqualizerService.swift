import Foundation
import AVFoundation
import Combine

#if os(macOS)

// MARK: - Equalizer Band

struct EQBand: Identifiable {
    let id: Int
    let frequency: Float   // Hz
    let label: String      // e.g. "60Hz"
    var gain: Float = 0    // dB, range -12...+12

    static let bands: [EQBand] = [
        EQBand(id: 0,  frequency: 60,    label: "60"),
        EQBand(id: 1,  frequency: 150,   label: "150"),
        EQBand(id: 2,  frequency: 250,   label: "250"),
        EQBand(id: 3,  frequency: 500,   label: "500"),
        EQBand(id: 4,  frequency: 750,   label: "750"),
        EQBand(id: 5,  frequency: 1000,  label: "1K"),
        EQBand(id: 6,  frequency: 1400,  label: "1.4K"),
        EQBand(id: 7,  frequency: 2500,  label: "2.5K"),
        EQBand(id: 8,  frequency: 3500,  label: "3.5K"),
        EQBand(id: 9,  frequency: 4100,  label: "4.1K"),
        EQBand(id: 10, frequency: 8000,  label: "8K"),
        EQBand(id: 11, frequency: 16000, label: "16K"),
    ]
}

// MARK: - EQ Presets

struct EQPreset: Identifiable {
    let id: String
    let name: String
    let gains: [Float]   // 12 values matching EQBand.bands

    static let presets: [EQPreset] = [
        EQPreset(id: "flat",     name: "Flat",       gains: [0,0,0,0,0,0,0,0,0,0,0,0]),
        EQPreset(id: "bass",     name: "Bass Boost",  gains: [8,6,4,2,0,0,0,0,0,0,0,0]),
        EQPreset(id: "treble",   name: "Treble Boost",gains: [0,0,0,0,0,0,2,3,4,5,6,7]),
        EQPreset(id: "vocal",    name: "Vocal",       gains: [-2,-2,0,2,4,4,3,2,1,0,-1,-2]),
        EQPreset(id: "rock",     name: "Rock",        gains: [5,3,2,0,-1,-1,0,2,3,4,4,3]),
        EQPreset(id: "pop",      name: "Pop",         gains: [-1,0,2,3,4,3,2,0,-1,-1,-1,-1]),
        EQPreset(id: "jazz",     name: "Jazz",        gains: [3,2,1,0,-1,-1,0,1,2,3,3,2]),
        EQPreset(id: "classical",name: "Classical",   gains: [4,3,2,0,-1,-2,-2,0,2,3,3,2]),
        EQPreset(id: "hiphop",   name: "Hip-Hop",     gains: [6,5,3,2,0,-1,-1,0,1,2,3,3]),
        EQPreset(id: "electronic",name: "Electronic", gains: [5,4,2,0,-1,0,1,2,3,4,5,4]),
    ]
}

// MARK: - Equalizer Service

@MainActor
class EqualizerService: ObservableObject {
    static let shared = EqualizerService()

    @Published var bands: [EQBand] = EQBand.bands
    @Published var isEnabled: Bool = true
    @Published var selectedPreset: String = "flat"

    // AVAudioEngine nodes
    let engine = AVAudioEngine()
    let playerNode = AVAudioPlayerNode()
    private let eq: AVAudioUnitEQ

    private let gainKey = "eq.gains"
    private let enabledKey = "eq.enabled"

    init() {
        eq = AVAudioUnitEQ(numberOfBands: EQBand.bands.count)
        setupEngine()
        loadSettings()
    }

    // MARK: - Setup

    private func setupEngine() {
        engine.attach(playerNode)
        engine.attach(eq)

        // Configure EQ bands
        for (i, band) in EQBand.bands.enumerated() {
            let eqBand = eq.bands[i]
            eqBand.filterType = (i == 0) ? .lowShelf : (i == EQBand.bands.count - 1) ? .highShelf : .parametric
            eqBand.frequency = band.frequency
            eqBand.bandwidth = 1.0
            eqBand.gain = band.gain
            eqBand.bypass = false
        }

        eq.bypass = !isEnabled

        // Connect: playerNode → eq → mainMixerNode → output
        let format = engine.mainMixerNode.outputFormat(forBus: 0)
        engine.connect(playerNode, to: eq, format: format)
        engine.connect(eq, to: engine.mainMixerNode, format: format)

        do {
            try engine.start()
        } catch {
            print("[SuckFy EQ] Engine start error: \(error)")
        }
    }

    // MARK: - Control

    func setBand(_ index: Int, gain: Float) {
        guard index < bands.count else { return }
        bands[index].gain = gain
        eq.bands[index].gain = gain
        selectedPreset = "custom"
        saveSettings()
    }

    func applyPreset(_ preset: EQPreset) {
        selectedPreset = preset.id
        for (i, gain) in preset.gains.enumerated() {
            bands[i].gain = gain
            eq.bands[i].gain = gain
        }
        saveSettings()
    }

    func toggleEnabled() {
        isEnabled.toggle()
        eq.bypass = !isEnabled
        saveSettings()
    }

    func reset() {
        applyPreset(EQPreset.presets.first!)
    }

    // MARK: - Persist

    private func saveSettings() {
        UserDefaults.standard.set(bands.map(\.gain), forKey: gainKey)
        UserDefaults.standard.set(isEnabled, forKey: enabledKey)
    }

    private func loadSettings() {
        isEnabled = UserDefaults.standard.object(forKey: enabledKey) as? Bool ?? true
        eq.bypass = !isEnabled
        if let gains = UserDefaults.standard.array(forKey: gainKey) as? [Float] {
            for (i, gain) in gains.prefix(bands.count).enumerated() {
                bands[i].gain = gain
                eq.bands[i].gain = gain
            }
        }
    }
}

#elseif os(iOS)

// MARK: - iOS Stub (Equalizer not supported on iOS)

struct EQBand: Identifiable {
    let id: Int
    let frequency: Float
    let label: String
    var gain: Float = 0
    
    static let bands: [EQBand] = []
}

struct EQPreset: Identifiable {
    let id: String
    let name: String
    let gains: [Float]
    
    static let presets: [EQPreset] = [
        EQPreset(id: "flat", name: "Flat", gains: [])
    ]
}

@MainActor
class EqualizerService: ObservableObject {
    static let shared = EqualizerService()
    
    @Published var bands: [EQBand] = []
    @Published var isEnabled: Bool = false
    @Published var selectedPreset: String = "flat"
    
    let engine = AVAudioEngine()
    let playerNode = AVAudioPlayerNode()
    
    init() {
        // Setup basic audio engine for iOS
        engine.attach(playerNode)
        let format = engine.mainMixerNode.outputFormat(forBus: 0)
        engine.connect(playerNode, to: engine.mainMixerNode, format: format)
        
        do {
            try engine.start()
        } catch {
            print("[iOS] Engine start error: \(error)")
        }
    }
    
    func setBand(_ index: Int, gain: Float) {}
    func applyPreset(_ preset: EQPreset) {}
    func toggleEnabled() {}
    func reset() {}
}

#endif
