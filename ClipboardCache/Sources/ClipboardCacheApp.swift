import SwiftUI

@main
struct ClipboardCacheApp: App {
    var body: some Scene {
        WindowGroup("Clipboard Cache", id: "main") {
            ContentView()
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified)
        .defaultSize(width: 340, height: 520)
    }
}
