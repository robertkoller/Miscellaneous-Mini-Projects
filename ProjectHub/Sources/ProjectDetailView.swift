import SwiftUI
import AppKit

struct ProjectDetailView: View {
    let project: Project

    @State private var output  = ""
    @State private var running = false
    @State private var process: Process?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(alignment: .firstTextBaseline) {
                if let iconImage = project.iconImage {
                    Image(nsImage: iconImage)
                        .resizable()
                        .interpolation(.high)
                        .frame(width: 40, height: 40)
                        .clipShape(RoundedRectangle(cornerRadius: 9))
                } else {
                    Text(project.type.icon).font(.largeTitle)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(project.name).font(.title2).fontWeight(.bold)
                    Text(project.description).foregroundStyle(.secondary)
                }
                Spacer()
                HStack {
                    Button("Open in Finder") {
                        NSWorkspace.shared.open(project.rootURL)
                    }
                    Button("Open in Terminal") {
                        openTerminal(at: project.rootURL)
                    }
                }
                .buttonStyle(.bordered)
            }
            .padding()

            Divider()

            // Actions
            if !project.actions.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(project.actions) { action in
                            Button(action.label) {
                                run(action)
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(running)
                        }
                        if running {
                            Button("Stop") { stopProcess() }
                                .buttonStyle(.bordered)
                                .tint(.red)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 10)
                }
                Divider()
            }

            // Output console
            ScrollViewReader { proxy in
                ScrollView {
                    Text(output.isEmpty ? "No output yet — run an action above." : output)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundStyle(output.isEmpty ? .tertiary : .primary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(12)
                        .id("bottom")
                }
                .background(Color(nsColor: .textBackgroundColor).opacity(0.5))
                .onChange(of: output) { _ in
                    proxy.scrollTo("bottom", anchor: .bottom)
                }
            }
        }
        .navigationTitle(project.name)
        .onDisappear { stopProcess() }
    }

    // MARK: - Actions

    private func run(_ action: RunAction) {
        stopProcess()
        output  = "$ \(action.command)\n"
        running = true

        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/bin/zsh")
        p.arguments     = ["-l", "-c", action.command]
        p.currentDirectoryURL = project.rootURL

        let pipe = Pipe()
        p.standardOutput = pipe
        p.standardError  = pipe
        process = p

        pipe.fileHandleForReading.readabilityHandler = { fh in
            let data = fh.availableData
            if let str = String(data: data, encoding: .utf8), !str.isEmpty {
                DispatchQueue.main.async { output += str }
            }
        }

        p.terminationHandler = { _ in
            DispatchQueue.main.async {
                running = false
                output += "\n[Process exited: \(p.terminationStatus)]"
                pipe.fileHandleForReading.readabilityHandler = nil
            }
        }

        do {
            try p.run()
        } catch {
            output += "Error: \(error.localizedDescription)\n"
            running = false
        }
    }

    private func stopProcess() {
        guard let p = process, p.isRunning else { return }
        p.terminate()
    }

    private func openTerminal(at url: URL) {
        let script = """
        tell application "Terminal"
            activate
            do script "cd '\(url.path)'"
        end tell
        """
        var err: NSDictionary?
        NSAppleScript(source: script)?.executeAndReturnError(&err)
    }
}
