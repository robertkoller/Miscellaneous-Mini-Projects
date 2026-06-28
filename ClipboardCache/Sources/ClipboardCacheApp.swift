import SwiftUI
import AppKit
import Carbon.HIToolbox
import ApplicationServices

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    let clipManager = ClipManager()
    private let hotkeyManager = HotkeyManager()
    private let toastManager = ToastManager()
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
            Task { @MainActor [weak self] in
                self?.lastFrontmostPID = app.processIdentifier
                self?.clipManager.lastFrontmostPID = app.processIdentifier
            }
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
                    let clipName = manager.autoName(for: contentAfter)
                    manager.addEntry(content: contentAfter, name: clipName)
                    self.toastManager.show("Saved: \(clipName)")
                }
            }
        }
        hotkeyManager.start()
    }

    func applicationWillTerminate(_ notification: Notification) {
        hotkeyManager.stop()
    }
}

@MainActor
final class ToastManager {
    private var window: NSWindow?
    private var dismissTask: Task<Void, Never>?

    func show(_ message: String) {
        dismissTask?.cancel()

        let size = CGSize(width: 300, height: 52)
        let hostingView = NSHostingView(rootView: ToastView(message: message))
        hostingView.frame = CGRect(origin: .zero, size: size)

        if window == nil {
            let toastWindow = NSWindow(
                contentRect: CGRect(origin: .zero, size: size),
                styleMask: [.borderless],
                backing: .buffered,
                defer: false
            )
            toastWindow.level = .floating
            toastWindow.backgroundColor = .clear
            toastWindow.isOpaque = false
            toastWindow.ignoresMouseEvents = true
            toastWindow.hasShadow = false
            window = toastWindow
        }

        window?.contentView = hostingView

        if let screen = NSScreen.main, let toastWindow = window {
            let screenFrame = screen.visibleFrame
            let originX = screenFrame.midX - size.width / 2
            let originY = screenFrame.maxY - size.height - 20
            toastWindow.setFrameOrigin(NSPoint(x: originX, y: originY))
        }

        window?.alphaValue = 1.0
        window?.orderFrontRegardless()

        dismissTask = Task {
            try? await Task.sleep(nanoseconds: 1_800_000_000)
            guard !Task.isCancelled else { return }
            NSAnimationContext.runAnimationGroup { context in
                context.duration = 0.25
                self.window?.animator().alphaValue = 0
            } completionHandler: {
                Task { @MainActor [weak self] in
                    self?.window?.orderOut(nil)
                }
            }
        }
    }
}

struct ToastView: View {
    let message: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
                .font(.system(size: 15, weight: .semibold))
            Text(message)
                .font(.system(size: 13, weight: .medium))
                .lineLimit(1)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
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
