import SwiftUI
import AppKit
import Carbon.HIToolbox
import ApplicationServices

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    let clipManager = ClipManager()
    private let hotkeyManager = HotkeyManager()
    private var lastFrontmostPID: pid_t = 0

    func applicationDidFinishLaunching(_ notification: Notification) {
        if !AXIsProcessTrusted() {
            let promptKey = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
            AXIsProcessTrustedWithOptions([promptKey: true] as CFDictionary)
        }

        // Track the last app the user was in (excluding ourselves) so we know
        // exactly where to send the synthetic ⌘C when the hotkey fires.
        NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.didActivateApplicationNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self = self,
                  let app = notification.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication,
                  app.processIdentifier != ProcessInfo.processInfo.processIdentifier else { return }
            self.lastFrontmostPID = app.processIdentifier
        }

        hotkeyManager.onTriggered = { [weak self] in
            guard let self = self else { return }
            let manager = self.clipManager
            let targetPID = self.lastFrontmostPID
            let targetName = NSRunningApplication(processIdentifier: targetPID)?.localizedName ?? "unknown"
            let changeCountBefore = NSPasteboard.general.changeCount
            let contentBefore = NSPasteboard.general.string(forType: .string) ?? "(empty)"

            manager.log("🔑 Hotkey fired")
            manager.log("🎯 Target PID: \(targetPID) (\(targetName))")
            manager.log("📋 Clipboard before — changeCount: \(changeCountBefore), content: \"\(contentBefore.prefix(40))\"")
            manager.log("🔒 Accessibility trusted: \(AXIsProcessTrusted())")

            guard targetPID != 0 else {
                manager.log("⚠️ No target PID — switch to another app first")
                return
            }

            let source = CGEventSource(stateID: .combinedSessionState)
            let keyDown = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_ANSI_C), keyDown: true)
            keyDown?.flags = .maskCommand
            let keyUp = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(kVK_ANSI_C), keyDown: false)
            keyUp?.flags = .maskCommand

            manager.log("📤 Posting ⌘C keyDown to PID \(targetPID)...")
            keyDown?.postToPid(targetPID)
            manager.log("📤 Posting ⌘C keyUp to PID \(targetPID)...")
            keyUp?.postToPid(targetPID)

            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                let changeCountAfter = NSPasteboard.general.changeCount
                let contentAfter = NSPasteboard.general.string(forType: .string) ?? "(empty)"
                manager.log("📋 Clipboard after — changeCount: \(changeCountAfter), content: \"\(contentAfter.prefix(40))\"")

                if changeCountAfter == changeCountBefore {
                    manager.log("❌ changeCount did NOT change — ⌘C was not received by target")
                } else {
                    manager.log("✅ changeCount changed — saving to cache")
                    guard !contentAfter.isEmpty else { return }
                    manager.addEntry(content: contentAfter, name: manager.autoName(for: contentAfter))
                }
            }
        }
        hotkeyManager.start()
    }

    func applicationWillTerminate(_ notification: Notification) {
        hotkeyManager.stop()
    }
}

@main
struct ClipboardCacheApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup("Clipboard Cache", id: "main") {
            ContentView()
                .environmentObject(appDelegate.clipManager)
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified)
        .defaultSize(width: 340, height: 580)
    }
}
