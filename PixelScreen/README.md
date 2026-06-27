# PixelScreen

A macOS menu bar app that captures your display in real-time and renders a pixelated overlay on top of all windows. Useful for preserving privacy during screen shares, recordings, or presentations while still letting you see your screen.

---

## How It Works

PixelScreen has three main components:

**`PixelScreenApp.swift`** — SwiftUI app entry point. Configures the menu bar extra (no Dock icon) and wires up the `PixelateManager` to the UI.

**`ControlView.swift`** — The dropdown UI that appears when you click the menu bar icon. Contains the start/stop toggle and the pixel size slider.

**`PixelateManager.swift`** — All the core logic, split into two classes:
- `PixelateManager` — manages state, owns the overlay window, and coordinates start/stop.
- `CaptureHelper` — implements `SCStreamOutput` to receive raw frames from ScreenCaptureKit, apply the pixelation filter, and push rendered frames to the overlay window.

### Capture Pipeline

1. `SCShareableContent` discovers the main display, excluding PixelScreen's own windows to prevent capture-feedback loops.
2. An `SCStream` captures the display at **15 FPS** via `minimumFrameInterval`.
3. Each `CMSampleBuffer` frame is converted to a `CIImage`.
4. The `CIPixellate` Core Image filter is applied with a configurable block size.
5. The filtered image is rendered to a `CGImage` via a Metal-backed `CIContext` (software renderer fallback included).
6. The result is pushed to a `CALayer` backing a full-screen `NSWindow` overlay.

### Overlay Window

The overlay is a borderless, transparent `NSWindow` configured to:
- Sit at window level `8` — above all app windows, below the Dock.
- Ignore all mouse events (`ignoresMouseEvents = true`).
- Appear across every Space and in full-screen mode (`canJoinAllSpaces`, `stationary`, `fullScreenAuxiliary`).

---

## Features

- **Menu bar icon** — eye icon (filled when active, slash when stopped).
- **Start/Stop toggle** — activates or deactivates the pixelated overlay. Keyboard shortcut: Return.
- **Pixel size slider** — adjusts block size from 1 to 40 pixels in real-time, no restart needed.
- **Permission handling** — on first launch, ScreenCaptureKit automatically triggers the Screen Recording permission dialog. If denied, the UI shows an error with a button to open System Settings.
- **Feedback-loop prevention** — PixelScreen excludes itself from the capture so the overlay is never captured and re-rendered.

---

## Requirements

- macOS 13.0 (Ventura) or later
- Swift 5.9+
- Screen Recording permission (granted via System Settings → Privacy & Security → Screen Recording)

---

## Setup & Running

All building and launching is handled by a single script:

```bash
cd PixelScreen/PixelScreenApp
./run.sh
```

What `run.sh` does:
1. Runs `swift build` to compile the Swift package.
2. Creates a `.build/PixelScreen.app` macOS app bundle.
3. Copies the compiled executable and `Info.plist` into the bundle.
4. Ad-hoc code-signs the app with `codesign --force --sign -`.
5. Launches the app with `open`.

> **Why ad-hoc signing?** macOS caches TCC (Transparency, Consent, and Control) permissions per code signature. Signing ensures that Screen Recording permission granted on a previous build persists after rebuilding — without it, the permission resets every time you rebuild.

The app appears in your menu bar with no Dock icon (`LSUIElement = true` in `Info.plist`).

---

## File Structure

```
PixelScreen/
└── PixelScreenApp/
    ├── Package.swift          # Swift Package Manager manifest
    ├── run.sh                 # Build and launch script
    └── Sources/
        ├── PixelScreenApp.swift    # App entry point, menu bar extra
        ├── ControlView.swift       # Dropdown UI (toggle + slider)
        ├── PixelateManager.swift   # Capture pipeline and overlay window
        └── Info.plist              # Bundle metadata and permissions
```

---

## System Frameworks Used

| Framework | Purpose |
|---|---|
| SwiftUI | Menu bar and control UI |
| AppKit | `NSWindow`, `NSScreen`, overlay management |
| ScreenCaptureKit | Display capture stream |
| CoreImage | `CIPixellate` filter |
| CoreMedia | `CMSampleBuffer` frame handling |
| CoreVideo | `CVPixelBuffer` pixel access |

---

## Implementation Notes

- **`@MainActor`** — `PixelateManager` runs on the main actor so all UI and window mutations are thread-safe.
- **`@unchecked Sendable`** — `CaptureHelper` is marked this way to cross the concurrency boundary into SCKit's internal background queues.
- **Frame gate** — an `isDisplaying` flag skips incoming frames if the previous frame hasn't finished rendering, preventing queue back-pressure at 15 FPS.
- **GPU rendering** — `CIContext(options: [.useSoftwareRenderer: false])` prefers Metal; falls back to CPU if Metal is unavailable.
