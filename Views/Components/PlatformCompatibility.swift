import SwiftUI

// MARK: - Platform-compatible hover modifier
extension View {
    /// Cross-platform hover effect - works on macOS with mouse hover, iOS shows on tap
    func platformHover(isHovered: Binding<Bool>) -> some View {
        #if os(macOS)
        self.onHover { hovering in
            isHovered.wrappedValue = hovering
        }
        #elseif os(iOS)
        // On iOS, we don't have hover - the view is always in "non-hovered" state
        // Interaction happens through taps
        self
        #endif
    }
    
    /// Convenience method for hover state with optional ID matching
    func platformHover<ID: Equatable>(id: ID, hoveredID: Binding<ID?>) -> some View {
        #if os(macOS)
        self.onHover { hovering in
            hoveredID.wrappedValue = hovering ? id : nil
        }
        #elseif os(iOS)
        self
        #endif
    }
}
