# ClipboardCache

A lightweight macOS clipboard history manager that lives in a floating window. Capture clips manually or use a global hotkey (`Cmd+Shift+C`) that copies from whichever app you were just using — without you having to switch focus first.

> **Note:** Clipboard history is in-memory only. All entries are lost when the app quits.

---

## How It Works

ClipboardCache has four source files:

**`ClipboardCacheApp.swift`** — App entry point with an `AppDelegate`. Handles the global hotkey callback, tracks which app was last focused, and orchestrates the synthetic Cmd+C → clipboard-read → save flow.

**`ClipManager.swift`** — Observable state store. Holds the list of `ClipEntry` values, handles naming logic, and exposes methods for adding, removing, copying, and clearing entries.

**`HotkeyManager.swift`** — Registers a system-wide hotkey using the Carbon Event Manager. Requires no Accessibility permission of its own; the hotkey fires even when ClipboardCache is not focused.

**`ContentView.swift`** — SwiftUI UI with three views: the main window layout, individual clip rows, and the collapsible debug log panel.

### Global Hotkey Flow (Cmd+Shift+C)

1. `HotkeyManager` fires the registered Carbon callback.
2. `AppDelegate` reads the PID of the last focused app (tracked via `NSWorkspace` notifications, excluding ClipboardCache's own PID).
3. The current `NSPasteboard.changeCount` is recorded.
4. Synthetic `keyDown` and `keyUp` events for Cmd+C are posted to the target app's process.
5. After a 150ms `DispatchQueue.main.asyncAfter` delay, `changeCount` is checked again.
6. If it increased, the new clipboard content is saved to the cache with an auto-generated name.
7. Every step is logged to the debug panel with emoji prefixes for easy visual scanning.

---

## Features

- **Global hotkey** (`Cmd+Shift+C`) — copies from the previously focused app and auto-saves to cache.
- **Manual save** (`+` button or `Cmd+S`) — saves whatever is currently on the clipboard. Supports auto-naming or a manual-name sheet.
- **Naming modes** — toggle between auto-naming (first 20 characters of content) and manual naming (you type the name in a sheet).
- **Copy to clipboard** — click the clipboard icon on any entry; it animates to a green checkmark for 1.5 seconds.
- **Delete entries** — per-entry delete button with hover effect, or "Clear All" in the footer.
- **Always-on-top toggle** — pin icon switches the window between `.normal` and `.floating` level.
- **Debug panel** — collapsible timestamped log of all hotkey activity. Supports copy-all and clear.

---

## Requirements

- macOS 13.0 (Ventura) or later
- Swift 5.9+
- **Accessibility permission** — required for sending synthetic key events to other apps (System Settings → Privacy & Security → Accessibility).

---

## Setup & Running

### Debug build (recommended for development)

```bash
cd ClipboardCache
./run.sh
```

What `run.sh` does:
1. Runs `swift build` (debug mode).
2. Creates `.build/ClipboardCache.app` bundle.
3. Ad-hoc code-signs the app (`codesign --force --sign -`).
4. Launches the app with `open`.

### Release build

```bash
./build_app.sh
```

Compiles in release mode (optimized), creates `ClipboardCache.app` in the project root, and does not auto-launch. Move it to `/Applications` to install.

> **Why ad-hoc signing?** macOS caches Accessibility permission grants per code signature. Signing ensures permission persists across rebuilds without re-prompting.

### First launch

On first run, the app checks `AXIsProcessTrusted()`. If Accessibility permission hasn't been granted, it calls `AXIsProcessTrustedWithOptions([kAXTrustedCheckOptionPrompt: true])` to open the System Settings prompt automatically.

---

## File Structure

```
ClipboardCache/
├── Package.swift              # Swift Package Manager manifest
├── run.sh                     # Debug build and launch script
├── build_app.sh               # Release build script
└── Sources/
    ├── ClipboardCacheApp.swift     # AppDelegate, hotkey callback, app scene
    ├── ClipManager.swift           # Observable state, ClipEntry model
    ├── HotkeyManager.swift         # Carbon event hotkey registration
    ├── ContentView.swift           # Full SwiftUI UI
    ├── Info.plist                  # Bundle metadata
    ├── AppIcon.icns                # App icon (compiled)
    └── AppIcon.iconset/            # Multi-resolution icon source images
```

---

## System Frameworks Used

| Framework | Purpose |
|---|---|
| SwiftUI | All UI |
| AppKit | `NSWindow`, `NSPasteboard`, window level management |
| Foundation | `NSWorkspace`, timers, `DispatchQueue` |
| Carbon.HIToolbox | System-wide hotkey registration |
| ApplicationServices | `AXIsProcessTrusted` Accessibility check |

---

## Implementation Notes

- **150ms delay** — empirically determined safe window between posting the synthetic Cmd+C and reading the updated clipboard. Short enough to feel instant, long enough for slow apps to update the pasteboard.
- **`changeCount` diffing** — `NSPasteboard.changeCount` increments on every write. Comparing before/after the synthetic copy reliably detects whether the target app actually put something new on the clipboard.
- **Carbon memory management** — `HotkeyManager` uses `Unmanaged<HotkeyManager>` to pass `self` as a raw pointer into the C-level Carbon callback. It manually retains on start and releases on stop/deinit to prevent premature deallocation.
- **No persistence** — entries exist only in memory. There is no `UserDefaults`, Core Data, or file storage. The cache rebuilds fresh on each launch.
- **`@MainActor @ObservableObject`** — `ClipManager` is isolated to the main actor so all state mutations are safe to call from both SwiftUI views and the AppDelegate hotkey handler.
- **Process exclusion** — `AppDelegate` tracks focus changes via `NSWorkspace.didActivateApplicationNotification` and skips storing ClipboardCache's own PID, so the hotkey never accidentally copies from itself.
