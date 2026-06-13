import SwiftUI

@main
struct PixelScreenApp: App {
    @StateObject private var manager = PixelateManager()

    var body: some Scene {
        // Menu bar only — no Dock icon, no extra windows.
        MenuBarExtra {
            ControlView()
                .environmentObject(manager)
        } label: {
            // Icon changes to reflect active state.
            Image(systemName: manager.isActive ? "eye.slash.fill" : "eye.slash")
        }
        .menuBarExtraStyle(.window)
    }
}
