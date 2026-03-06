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
                        Text("Capturing token…")
                            .font(.system(size: 12))
                            .foregroundStyle(.orange)
                    }
                }
                Button {
                    dismiss()
                } label: {
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

            if let token = capturedToken {
                // Success state
                VStack(spacing: 20) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 64))
                        .foregroundStyle(.green)
                    Text("Connected!")
                        .font(.system(size: 24, weight: .bold))
                    Text("SoundCloud account connected successfully.\nYou can now download full tracks.")
                        .font(.system(size: 14))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                    Button("Done") {
                        sc.saveToken(token)
                        dismiss()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                    .controlSize(.large)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                // WebView
                SCWebView(onTokenCaptured: { token in
                    capturedToken = token
                }, onCapturing: { capturing in
                    isCapturing = capturing
                })
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                // Info bar
                HStack(spacing: 8) {
                    Image(systemName: "info.circle")
                        .foregroundStyle(.orange)
                        .font(.system(size: 13))
                    Text("Log in with your SoundCloud account. SuckFy will automatically capture your session token.")
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(.ultraThinMaterial)
            }
        }
        .frame(width: 500, height: 640)
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

            // After login redirect — try to extract token from cookies and JS
            if url.contains("soundcloud.com") && !url.contains("login") {
                onCapturing(true)
                extractToken(from: webView)
            }
        }

        private func extractToken(from webView: WKWebView) {
            // Method 1: Extract from cookies
            webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { cookies in
                for cookie in cookies {
                    if cookie.name == "oauth_token" || cookie.name == "sc_anonymous_id" {
                        if cookie.name == "oauth_token" {
                            DispatchQueue.main.async {
                                self.captureToken(cookie.value)
                            }
                            return
                        }
                    }
                }

                // Method 2: Extract from JS localStorage / API call
                webView.evaluateJavaScript("""
                    (function() {
                        // Try to get from SC app state
                        try {
                            var keys = Object.keys(localStorage);
                            for (var k of keys) {
                                var v = localStorage.getItem(k);
                                if (v && v.includes('oauth_token')) {
                                    var match = v.match(/"oauth_token":"([^"]+)"/);
                                    if (match) return match[1];
                                }
                            }
                        } catch(e) {}

                        // Try cookies string
                        var cookies = document.cookie;
                        var match = cookies.match(/oauth_token=([^;]+)/);
                        if (match) return match[1];

                        return null;
                    })()
                """) { result, error in
                    if let token = result as? String, !token.isEmpty {
                        DispatchQueue.main.async {
                            self.captureToken(token)
                        }
                    } else {
                        // Method 3: Intercept API calls via JS injection
                        self.injectTokenInterceptor(webView)
                    }
                }
            }
        }

        private func injectTokenInterceptor(_ webView: WKWebView) {
            // Intercept XHR/fetch calls to api-v2.soundcloud.com to grab OAuth token
            webView.evaluateJavaScript("""
                (function() {
                    var origOpen = XMLHttpRequest.prototype.open;
                    XMLHttpRequest.prototype.open = function(method, url) {
                        if (url.includes('api-v2.soundcloud.com') || url.includes('api.soundcloud.com')) {
                            this.addEventListener('readystatechange', function() {
                                if (this.readyState === 4) {
                                    var auth = this.getResponseHeader ? this.getResponseHeader('Authorization') : null;
                                    if (auth && auth.includes('OAuth')) {
                                        window._scOAuthToken = auth.replace('OAuth ', '').trim();
                                    }
                                }
                            });
                        }
                        return origOpen.apply(this, arguments);
                    };
                    // Check if already available
                    return window._scOAuthToken || null;
                })()
            """) { _, _ in }

            // Poll for token every 2 seconds
            pollForToken(webView, attempts: 0)
        }

        private func pollForToken(_ webView: WKWebView, attempts: Int) {
            guard attempts < 30, !tokenCaptured else { return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
                guard let self else { return }
                webView.evaluateJavaScript("window._scOAuthToken || null") { result, _ in
                    if let token = result as? String, !token.isEmpty {
                        self.captureToken(token)
                    } else {
                        self.pollForToken(webView, attempts: attempts + 1)
                    }
                }
            }
        }

        private func captureToken(_ token: String) {
            guard !tokenCaptured, !token.isEmpty else { return }
            tokenCaptured = true
            onCapturing(false)
            onTokenCaptured(token)
        }
    }
}
