import AppKit
import ScreenCaptureKit
import CoreImage
import CoreImage.CIFilterBuiltins
import CoreMedia
import CoreVideo

// MARK: - Overlay window

final class OverlayWindow: NSWindow {
    private let displayLayer = CALayer()

    init() {
        let screen = NSScreen.main ?? NSScreen.screens[0]
        super.init(
            contentRect: screen.frame,
            styleMask:   .borderless,
            backing:     .buffered,
            defer:       false
        )
        isOpaque             = false
        backgroundColor      = .clear
        level                = NSWindow.Level(rawValue: 8)   // above apps, below dock
        ignoresMouseEvents   = true
        hasShadow            = false
        isReleasedWhenClosed = false
        collectionBehavior   = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]

        let v = NSView(frame: CGRect(origin: .zero, size: screen.frame.size))
        v.wantsLayer = true
        displayLayer.frame           = v.bounds
        displayLayer.contentsGravity = .resize
        displayLayer.contentsScale   = screen.backingScaleFactor
        v.layer = displayLayer
        contentView = v
    }

    func show(with image: CGImage) {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        displayLayer.contents = image
        CATransaction.commit()
        if !isVisible { orderFront(nil) }
    }

    func hide() { orderOut(nil) }
}

// MARK: - Manager (main-actor, drives SwiftUI)

@MainActor
final class PixelateManager: NSObject, ObservableObject {
    @Published var isActive    = false
    @Published var pixelSize: Double = 10
    @Published var errorText: String?

    private let overlay = OverlayWindow()
    private var helper: CaptureHelper?

    func toggle() {
        isActive ? stop() : start()
    }

    func start() {
        errorText = nil
        Task {
            do {
                let h = CaptureHelper(pixelSize: Float(pixelSize), overlay: overlay)
                try await h.begin()
                helper   = h
                isActive = true
            } catch {
                errorText = error.localizedDescription
            }
        }
    }

    func stop() {
        Task {
            await helper?.end()
            helper   = nil
            isActive = false
            overlay.hide()
        }
    }

    func setPixelSize(_ v: Double) {
        pixelSize = v
        helper?.pixelSize = Float(v)
    }
}

// MARK: - Capture helper (non-isolated, SCK runs on background queues)

final class CaptureHelper: NSObject, SCStreamOutput, @unchecked Sendable {
    var pixelSize: Float
    private weak var overlay: OverlayWindow?
    private var stream: SCStream?
    private let ctx = CIContext(options: [.useSoftwareRenderer: false])
    private let frameQueue = DispatchQueue(label: "pixelscreen.frames", qos: .userInteractive)
    private var isDisplaying = false

    init(pixelSize: Float, overlay: OverlayWindow) {
        self.pixelSize = pixelSize
        self.overlay   = overlay
    }

    func begin() async throws {
        // Requesting shareableContent also triggers the Screen Recording
        // permission dialog if it hasn't been granted yet.
        let content = try await SCShareableContent.excludingDesktopWindows(
            false, onScreenWindowsOnly: false
        )
        guard let display = content.displays.first else {
            throw NSError(domain: "PixelScreen", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "No display available."])
        }

        // Exclude our entire app so the overlay never gets captured — preventing
        // the feedback loop where pixelating the pixelated overlay produces a
        // static-looking frozen image. App-level exclusion is used because the
        // overlay window may not be "on screen" yet when this runs.
        let myPID = ProcessInfo.processInfo.processIdentifier
        let filter: SCContentFilter
        if let myApp = content.applications.first(where: { $0.processID == myPID }) {
            filter = SCContentFilter(display: display, excludingApplications: [myApp], exceptingWindows: [])
        } else {
            let excluded = content.windows.filter { $0.owningApplication?.processID == myPID }
            filter = SCContentFilter(display: display, excludingWindows: excluded)
        }

        let cfg = SCStreamConfiguration()
        cfg.width                  = display.width
        cfg.height                 = display.height
        cfg.pixelFormat            = kCVPixelFormatType_32BGRA
        cfg.minimumFrameInterval   = CMTime(value: 1, timescale: 15)   // 15 fps
        cfg.capturesAudio          = false
        cfg.showsCursor            = false

        let s = SCStream(filter: filter, configuration: cfg, delegate: nil)
        try s.addStreamOutput(self, type: .screen, sampleHandlerQueue: frameQueue)
        try await s.startCapture()
        stream = s
    }

    func end() async {
        guard let s = stream else { return }
        try? await s.stopCapture()
        stream = nil
        await MainActor.run { overlay?.hide() }
    }

    // Called on a background queue by SCKit.
    nonisolated func stream(
        _ stream: SCStream,
        didOutputSampleBuffer buffer: CMSampleBuffer,
        of type: SCStreamOutputType
    ) {
        guard type == .screen, let pb = buffer.imageBuffer else { return }

        var img   = CIImage(cvPixelBuffer: pb)
        let extent = img.extent
        let scale  = max(2.0, pixelSize)

        // CIPixellate: block-based pixelation — exactly what we want.
        let f = CIFilter.pixellate()
        f.inputImage = img
        f.scale      = scale
        f.center     = CGPoint(x: extent.midX, y: extent.midY)
        if let out = f.outputImage?.cropped(to: extent) { img = out }

        guard !isDisplaying else { return }
        isDisplaying = true
        guard let cg = ctx.createCGImage(img, from: img.extent) else {
            isDisplaying = false
            return
        }
        DispatchQueue.main.async { [weak self] in
            self?.overlay?.show(with: cg)
            self?.isDisplaying = false
        }
    }
}
