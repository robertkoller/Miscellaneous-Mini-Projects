import SwiftUI

struct ControlView: View {
    @EnvironmentObject private var manager: PixelateManager

    var body: some View {
        VStack(spacing: 12) {
            Text("PixelScreen")
                .font(.headline)

            Button(action: { manager.toggle() }) {
                HStack {
                    Image(systemName: manager.isActive ? "eye.slash.fill" : "eye")
                    Text(manager.isActive ? "Stop Pixelating" : "Start Pixelating")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(manager.isActive ? .red : .accentColor)
            .keyboardShortcut(.return)

            VStack(alignment: .leading, spacing: 4) {
                Text("Pixel size: \(Int(manager.pixelSize))")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Slider(
                    value: Binding(
                        get: { manager.pixelSize },
                        set: { manager.setPixelSize($0) }
                    ),
                    in: 1...40, step: 1
                )
            }

            if let err = manager.errorText {
                Text(err)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .fixedSize(horizontal: false, vertical: true)
                Button("Open Screen Recording Settings") {
                    NSWorkspace.shared.open(
                        URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")!
                    )
                }
                .font(.caption)
            }

            Divider()

            Button("Quit PixelScreen") { NSApplication.shared.terminate(nil) }
                .foregroundStyle(.secondary)
                .font(.caption)
        }
        .padding(16)
        .frame(width: 260)
    }
}
