import SwiftUI
import AppKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    // Clicking the dock icon when the window is hidden/closed reopens it.
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag {
            showMainWindow()
        }
        return true
    }
}

@main
struct ProjectHubApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup("Project Hub", id: "main") {
            ContentView()
                .frame(minWidth: 800, minHeight: 520)
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified)

        MenuBarExtra("Project Hub", systemImage: "square.grid.2x2") {
            MenuBarButtons()
        }
        .menuBarExtraStyle(.window)
    }
}

private struct MenuBarButtons: View {
    @Environment(\.openWindow) private var openWindow
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Button("Open Project Hub") {
            dismiss()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                showMainWindow()
            }
        }
        Divider()
        Button("Quit") { NSApplication.shared.terminate(nil) }
    }
}

private func showMainWindow() {
    NSApp.activate(ignoringOtherApps: true)
    if let window = NSApp.windows.first(where: { $0.styleMask.contains(.titled) }) {
        window.tabGroup?.selectedWindow = window
        window.makeKeyAndOrderFront(nil)
    }
}
