import SwiftUI

// MARK: - SoundCloud Auth View
// Simple OAuth token input — get your token from browser DevTools

struct SoundCloudAuthView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var sc = SoundCloudService.shared
    @State private var tokenInput: String = ""
    @State private var isConnected = false

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                HStack(spacing: 10) {
                    Image(systemName: "cloud.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(.orange)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Connect SoundCloud")
                            .font(.system(size: 16, weight: .bold))
                        Text("Paste your OAuth token to access full tracks")
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Button { dismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(.ultraThinMaterial)

            Divider()

            if isConnected {
                // ✅ Success
                VStack(spacing: 24) {
                    Spacer()
                    ZStack {
                        Circle().fill(Color.orange.opacity(0.15)).frame(width: 120, height: 120)
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 72))
                            .foregroundStyle(.orange)
                    }
                    VStack(spacing: 10) {
                        Text("🎉 Connected!")
                            .font(.system(size: 28, weight: .bold))
                        if !sc.username.isEmpty {
                            Text("Token saved for: \(sc.username)")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(.orange)
                        }
                        Text("You can now search and download full SoundCloud tracks.")
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.shield.fill").foregroundStyle(.green)
                            Text("Token saved securely in Keychain")
                                .font(.system(size: 13))
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 14).padding(.vertical, 8)
                        .background(Color.green.opacity(0.1), in: Capsule())
                    }
                    Button("Done — Start Listening") { dismiss() }
                        .buttonStyle(.borderedProminent)
                        .tint(.orange)
                        .controlSize(.large)
                        .keyboardShortcut(.defaultAction)
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .transition(.opacity.combined(with: .scale))
            } else {
                // Token input
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {

                        // How to get token
                        VStack(alignment: .leading, spacing: 12) {
                            Text("How to get your OAuth token:")
                                .font(.system(size: 14, weight: .semibold))

                            VStack(alignment: .leading, spacing: 8) {
                                stepRow(n: "1", text: "Open **soundcloud.com** in your browser and log in")
                                stepRow(n: "2", text: "Open **DevTools** (F12 or Cmd+Option+I)")
                                stepRow(n: "3", text: "Go to **Network** tab → filter by `api-v2`")
                                stepRow(n: "4", text: "Click any track — find a request to `api-v2.soundcloud.com`")
                                stepRow(n: "5", text: "In **Cookies** tab find `oauth_token` value and copy it")
                            }
                        }
                        .padding(16)
                        .background(Color.orange.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))

                        // Token field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("OAuth Token")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(.secondary)

                            HStack(spacing: 10) {
                                Image(systemName: "key.fill")
                                    .foregroundStyle(.orange)
                                    .font(.system(size: 14))
                                TextField("Paste your oauth_token here…", text: $tokenInput)
                                    .textFieldStyle(.plain)
                                    .font(.system(size: 13, design: .monospaced))
                                    .onSubmit { connect() }
                                if !tokenInput.isEmpty {
                                    Button { tokenInput = "" } label: {
                                        Image(systemName: "xmark.circle.fill").foregroundStyle(.tertiary)
                                    }.buttonStyle(.plain)
                                }
                            }
                            .padding(12)
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.orange.opacity(0.3), lineWidth: 1))

                            Text("Your token is stored locally in Keychain and never sent anywhere else.")
                                .font(.system(size: 11))
                                .foregroundStyle(.tertiary)
                        }

                        // Connect button
                        Button(action: connect) {
                            Label("Connect SoundCloud", systemImage: "cloud.fill")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(tokenInput.isEmpty ? Color.gray : Color.orange, in: RoundedRectangle(cornerRadius: 10))
                        }
                        .buttonStyle(.plain)
                        .disabled(tokenInput.trimmingCharacters(in: .whitespaces).isEmpty)

                        // If already connected — show logout
                        if sc.isAuthenticated {
                            Button {
                                sc.logout()
                                tokenInput = ""
                            } label: {
                                Label("Disconnect SoundCloud", systemImage: "person.slash")
                                    .font(.system(size: 13))
                                    .foregroundStyle(.red)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(Color.red.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(20)
                }
            }
        }
        .frame(width: 480, height: 560)
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: isConnected)
        .onAppear {
            if sc.isAuthenticated { tokenInput = sc.authToken }
        }
    }

    private func connect() {
        let token = tokenInput.trimmingCharacters(in: .whitespaces)
        guard !token.isEmpty else { return }
        
        Task {
            await sc.saveToken(token)
            await MainActor.run {
                withAnimation { isConnected = true }
            }
        }
    }

    private func stepRow(n: String, text: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text(n)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 20, height: 20)
                .background(Color.orange, in: Circle())
            Text(LocalizedStringKey(text))
                .font(.system(size: 13))
                .foregroundStyle(.primary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
