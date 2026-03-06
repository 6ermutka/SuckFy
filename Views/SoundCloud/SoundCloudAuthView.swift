import SwiftUI
import WebKit

// MARK: - SoundCloud Auth View
// Shows WKWebView with soundcloud.com, intercepts OAuth token from cookies/requests

struct SoundCloudAuthView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var sc = SoundCloudService.shared
    @State private var isCapturing = false
    @State private var capturedToken: String?
    @State private var error: String?

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Connect SoundCloud")
                        .font(.system(size: 16, weight: .bold))
                    Text("Log in to access full tracks")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if isCapturing {
                    HStack(spacing: 6) {
                        ProgressView().scaleEffect(0.7)
                        Text("Capturing session…")
                            .font(.system(size: 12))
                            .foregroundStyle(.orange)
                    }
                    .transition(.opacity)
                }
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
            .animation(.easeInOut, value: isCapturing)

            Divider()

            if capturedToken != nil {
                // ✅ Success state
                VStack(spacing: 24) {
                    Spacer()

                    ZStack {
                        Circle()
                            .fill(Color.orange.opacity(0.15))
                            .frame(width: 120, height: 120)
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 72))
                            .foregroundStyle(.orange)
                    }
                    .transition(.scale.combined(with: .opacity))

                    VStack(spacing: 10) {
                        Text("🎉 Connected!")
                            .font(.system(size: 28, weight: .bold))

                        if !sc.username.isEmpty {
                            Text("Logged in as \(sc.username)")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(.orange)
                        }

                        Text("Your SoundCloud session has been captured.\nYou can now search and download full tracks.")
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)

                        // Show cookie file status
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.shield.fill")
                                .foregroundStyle(.green)
                                .font(.system(size: 13))
                            Text("Session saved securely")
                                .font(.system(size: 13))
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Color.green.opacity(0.1), in: Capsule())
                    }

                    Button("Done — Start Listening") {
                        dismiss()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                    .controlSize(.large)
                    .keyboardShortcut(.defaultAction)

                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .transition(.opacity)
            } else {
                // WebView
                SCWebView(onTokenCaptured: { token in
                    withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                        capturedToken = token
                    }
                }, onCapturing: { capturing in
                    withAnimation { isCapturing = capturing }
                })
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                // Info bar
                HStack(spacing: 8) {
                    Image(systemName: "info.circle")
                        .foregroundStyle(.orange)
                        .font(.system(size: 13))
                    Text("Log in with your SoundCloud account — SuckFy will automatically capture your session.")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(.ultraThinMaterial)
            }
        }
        .frame(width: 500, height: 640)
        .animation(.easeInOut(duration: 0.4), value: capturedToken != nil)
    }
}

// MARK: - WKWebView wrapper

struct SCWebView: NSViewRepresentable {
    let onTokenCaptured: (String) -> Void
    let onCapturing: (Bool) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onTokenCaptured: onTokenCaptured, onCapturing: onCapturing)
    }

    func makeNSView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .nonPersistent() // Fresh session

        // Intercept all requests to capture OAuth token
        let contentController = WKUserContentController()
        config.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        context.coordinator.webView = webView

        // Load SoundCloud login
        let url = URL(string: "https://soundcloud.com/login")!
        webView.load(URLRequest(url: url))

        return webView
    }

    func updateNSView(_ nsView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKNavigationDelegate {
        let onTokenCaptured: (String) -> Void
        let onCapturing: (Bool) -> Void
        weak var webView: WKWebView?
        private var tokenCaptured = false

        init(onTokenCaptured: @escaping (String) -> Void, onCapturing: @escaping (Bool) -> Void) {
            self.onTokenCaptured = onTokenCaptured
            self.onCapturing = onCapturing
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard !tokenCaptured else { return }
            let url = webView.url?.absoluteString ?? ""

            // After successful login — user lands on soundcloud.com (not /login)
            if url.contains("soundcloud.com") && !url.contains("/login") && !url.contains("/signin") {
                onCapturing(true)
                // Wait a bit for cookies to be set
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
                    self?.extractCookies(from: webView)
                }
            }
        }

        private func extractCookies(from webView: WKWebView) {
            webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { [weak self] cookies in
                guard let self else { return }

                let scCookies = cookies.filter { $0.domain.contains("soundcloud") }
                print("[SuckFy SC] Got \(scCookies.count) SC cookies")
                for c in scCookies { print("  \(c.name) = \(c.value.prefix(20))...") }

                // Check if we have session cookies (user is logged in)
                let hasSession = scCookies.contains { 
                    ["sc_anonymous_id", "sc_session", "connect_session", "soundcloud_session_hint"].contains($0.name) 
                }

                guard hasSession && !scCookies.isEmpty else {
                    // Not logged in yet — keep waiting
                    self.onCapturing(false)
                    return
                }

                // Extract username from page title or JS
                webView.evaluateJavaScript("""
                    document.querySelector('.header__userNavItem .header__userUri')?.textContent 
                    || document.title 
                    || 'SoundCloud User'
                """) { result, _ in
                    let name = (result as? String) ?? "SoundCloud User"
                    DispatchQueue.main.async {
                        self.tokenCaptured = true
                        self.onCapturing(false)
                        // Pass all cookies to service
                        Task { @MainActor in
                            SoundCloudService.shared.saveCookies(scCookies)
                            SoundCloudService.shared.username = name.trimmingCharacters(in: .whitespacesAndNewlines)
                        }
                        self.onTokenCaptured("connected")
                    }
                }
            }
        }
    }
}
