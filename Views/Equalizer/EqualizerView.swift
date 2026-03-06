import SwiftUI

struct EqualizerView: View {
    @ObservedObject private var eq = EqualizerService.shared
    @Environment(\.dismiss) private var dismiss

    private let minGain: Float = -12
    private let maxGain: Float = 12

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Equalizer")
                        .font(.system(size: 18, weight: .bold))
                    Text("12-band parametric EQ")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                Spacer()

                // Enable toggle
                HStack(spacing: 6) {
                    Text(eq.isEnabled ? "On" : "Off")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(eq.isEnabled ? .green : .secondary)
                    Toggle("", isOn: Binding(
                        get: { eq.isEnabled },
                        set: { _ in eq.toggleEnabled() }
                    ))
                    .toggleStyle(.switch)
                    .tint(.green)
                    .scaleEffect(0.85)
                }

                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .padding(.leading, 8)
            }
            .padding(.horizontal, 24)
            .padding(.top, 20)
            .padding(.bottom, 16)

            Divider().opacity(0.4)

            // Presets
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(EQPreset.presets) { preset in
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                eq.applyPreset(preset)
                            }
                        } label: {
                            Text(preset.name)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(eq.selectedPreset == preset.id ? .black : .primary)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(
                                    Capsule()
                                        .fill(eq.selectedPreset == preset.id ? Color.green : Color.primary.opacity(0.08))
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.vertical, 12)
            }

            Divider().opacity(0.4)

            // EQ Bands — vertical sliders
            HStack(alignment: .bottom, spacing: 0) {
                ForEach($eq.bands) { $band in
                    EQBandSlider(band: $band, minGain: minGain, maxGain: maxGain)
                        .frame(maxWidth: .infinity)
                        .opacity(eq.isEnabled ? 1 : 0.4)
                        .disabled(!eq.isEnabled)
                        .onChange(of: band.gain) { newGain in
                            eq.setBand(band.id, gain: newGain)
                        }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 8)

            // dB scale labels
            HStack {
                Text("+12 dB")
                Spacer()
                Text("0 dB")
                Spacer()
                Text("-12 dB")
            }
            .font(.system(size: 10, design: .monospaced))
            .foregroundStyle(.tertiary)
            .padding(.horizontal, 20)
            .padding(.bottom, 16)

            Divider().opacity(0.4)

            // Reset button
            Button {
                withAnimation(.easeInOut(duration: 0.3)) {
                    eq.reset()
                }
            } label: {
                Label("Reset to Flat", systemImage: "arrow.counterclockwise")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .padding(.vertical, 12)
        }
        .frame(width: 640)
        .background(.ultraThickMaterial)
    }
}

// MARK: - Band Slider

struct EQBandSlider: View {
    @Binding var band: EQBand
    let minGain: Float
    let maxGain: Float

    @State private var isDragging = false
    private let sliderHeight: CGFloat = 160

    var normalizedValue: CGFloat {
        CGFloat((band.gain - minGain) / (maxGain - minGain))
    }

    var gainColor: Color {
        if band.gain > 0 { return Color.green }
        if band.gain < 0 { return Color.orange }
        return Color.secondary
    }

    var body: some View {
        VStack(spacing: 6) {
            // Gain value
            Text(band.gain == 0 ? "0" : String(format: "%+.0f", band.gain))
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(gainColor)
                .frame(height: 14)

            // Vertical slider
            GeometryReader { geo in
                let h = geo.size.height
                let thumbY = h - normalizedValue * h

                ZStack(alignment: .bottom) {
                    // Track background
                    Capsule()
                        .fill(Color.primary.opacity(0.08))
                        .frame(width: 4)
                        .frame(maxHeight: .infinity)
                        .frame(maxWidth: .infinity)

                    // Zero line
                    Rectangle()
                        .fill(Color.primary.opacity(0.2))
                        .frame(width: 14, height: 1)
                        .frame(maxWidth: .infinity)
                        .offset(y: -(h * 0.5))

                    // Filled portion
                    let fillHeight = abs(normalizedValue - 0.5) * h
                    let fillOffset = band.gain >= 0 ? -(h * 0.5 + fillHeight / 2) : -(h * 0.5 - fillHeight / 2)
                    Capsule()
                        .fill(gainColor.opacity(0.8))
                        .frame(width: 4, height: max(2, fillHeight))
                        .frame(maxWidth: .infinity)
                        .offset(y: fillOffset)

                    // Thumb
                    Circle()
                        .fill(isDragging ? gainColor : Color.white)
                        .frame(width: isDragging ? 16 : 12, height: isDragging ? 16 : 12)
                        .shadow(color: .black.opacity(0.3), radius: 3, x: 0, y: 1)
                        .frame(maxWidth: .infinity)
                        .offset(y: -(normalizedValue * h))
                        .animation(.spring(response: 0.2, dampingFraction: 0.8), value: isDragging)
                }
                .frame(maxHeight: .infinity)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { drag in
                            isDragging = true
                            let fraction = 1 - Double(drag.location.y / h)
                            let clamped = max(0, min(1, fraction))
                            let newGain = Float(clamped) * (maxGain - minGain) + minGain
                            // Snap to 0 near center
                            band.gain = abs(newGain) < 0.5 ? 0 : newGain
                        }
                        .onEnded { _ in isDragging = false }
                )
            }
            .frame(height: sliderHeight)

            // Frequency label
            Text(band.label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.secondary)
                .frame(height: 14)
        }
    }
}

#Preview {
    EqualizerView()
        .preferredColorScheme(.dark)
}
