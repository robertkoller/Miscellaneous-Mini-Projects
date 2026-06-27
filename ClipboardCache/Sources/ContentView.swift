import SwiftUI
import AppKit

struct ContentView: View {
    @EnvironmentObject private var manager: ClipManager
    @State private var alwaysOnTop = false
    @State private var showingNamingSheet = false
    @State private var pendingClipContent = ""
    @State private var showingClearConfirmation = false
    @State private var debugVisible = true

    var body: some View {
        VStack(spacing: 0) {
            headerBar
            Divider()
            entriesArea
            if !manager.entries.isEmpty {
                Divider()
                footerBar
            }
        }
        .frame(minWidth: 280, minHeight: 300)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if !manager.debugLines.isEmpty {
                Divider()
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Debug")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Button(debugVisible ? "Hide" : "Show") { debugVisible.toggle() }
                            .font(.caption)
                            .buttonStyle(.plain)
                            .foregroundStyle(.secondary)
                        Button("Copy") {
                            NSPasteboard.general.clearContents()
                            NSPasteboard.general.setString(manager.debugLines.joined(separator: "\n"), forType: .string)
                        }
                        .font(.caption)
                        .buttonStyle(.plain)
                        .foregroundStyle(.secondary)
                        Button("Clear") { manager.debugLines.removeAll() }
                            .font(.caption)
                            .buttonStyle(.plain)
                            .foregroundStyle(.secondary)
                    }
                    if debugVisible {
                        ScrollViewReader { proxy in
                            ScrollView {
                                VStack(alignment: .leading, spacing: 2) {
                                    ForEach(Array(manager.debugLines.enumerated()), id: \.offset) { index, line in
                                        Text(line)
                                            .font(.system(size: 10, design: .monospaced))
                                            .foregroundStyle(.primary)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                            .id(index)
                                    }
                                }
                                .padding(6)
                            }
                            .frame(height: 140)
                            .background(Color(nsColor: .textBackgroundColor).opacity(0.6))
                            .onChange(of: manager.debugLines.count) { _ in
                                proxy.scrollTo(manager.debugLines.count - 1, anchor: .bottom)
                            }
                        }
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
            }
        }
        .sheet(isPresented: $showingNamingSheet) {
            NamingSheet(
                clipContent: pendingClipContent,
                initialName: manager.autoName(for: pendingClipContent),
                onSave: { name in
                    manager.addEntry(content: pendingClipContent, name: name)
                    showingNamingSheet = false
                    pendingClipContent = ""
                },
                onCancel: {
                    showingNamingSheet = false
                    pendingClipContent = ""
                }
            )
        }
        .confirmationDialog(
            "Clear all saved clips?",
            isPresented: $showingClearConfirmation,
            titleVisibility: .visible
        ) {
            Button("Clear All", role: .destructive) {
                manager.clearAll()
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    private var headerBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "clipboard")
                .foregroundStyle(.tint)
            Text("Clipboard Cache")
                .font(.headline)
            Spacer()
            Button {
                manager.namingEnabled.toggle()
            } label: {
                Image(systemName: manager.namingEnabled ? "tag.fill" : "tag")
            }
            .buttonStyle(.bordered)
            .tint(manager.namingEnabled ? .blue : .secondary)
            .help(manager.namingEnabled
                ? "Manual naming on — click to switch to auto-name"
                : "Auto-naming on — click to require a name for each clip")

            Button {
                alwaysOnTop.toggle()
                applyWindowLevel()
            } label: {
                Image(systemName: alwaysOnTop ? "pin.fill" : "pin")
            }
            .buttonStyle(.bordered)
            .tint(alwaysOnTop ? .orange : .secondary)
            .help(alwaysOnTop ? "Always on top: on" : "Always on top: off")

            Button {
                saveClipboard()
            } label: {
                Image(systemName: "plus")
            }
            .buttonStyle(.borderedProminent)
            .help("Save current clipboard (⌘S in app, ⌘⇧C anywhere)")
            .keyboardShortcut("s", modifiers: [.command])
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }

    private var entriesArea: some View {
        Group {
            if manager.entries.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "clipboard")
                        .font(.system(size: 44))
                        .foregroundStyle(.quaternary)
                    Text("No saved clips")
                        .foregroundStyle(.secondary)
                    Text("Copy something, then press +")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(manager.entries) { entry in
                        ClipEntryRow(entry: entry, manager: manager)
                    }
                }
                .listStyle(.plain)
            }
        }
    }

    private var footerBar: some View {
        HStack {
            Spacer()
            Button("Clear All") {
                showingClearConfirmation = true
            }
            .buttonStyle(.bordered)
            .tint(.red)
            Spacer()
        }
        .padding(10)
    }

    private func saveClipboard() {
        guard let content = manager.currentClipboardContent(), !content.isEmpty else {
            return
        }
        if manager.namingEnabled {
            pendingClipContent = content
            showingNamingSheet = true
        } else {
            manager.addEntry(content: content, name: manager.autoName(for: content))
        }
    }

    private func applyWindowLevel() {
        if let window = NSApp.windows.first(where: { $0.styleMask.contains(.titled) }) {
            window.level = alwaysOnTop ? .floating : .normal
        }
    }
}

struct ClipEntryRow: View {
    let entry: ClipEntry
    let manager: ClipManager
    @State private var justCopied = false

    var body: some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.name)
                    .font(.body)
                    .fontWeight(.medium)
                    .lineLimit(1)
                if entry.content != entry.name {
                    Text(entry.content)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            Spacer()
            Button {
                copyEntry()
            } label: {
                Image(systemName: justCopied ? "checkmark" : "clipboard")
                    .foregroundStyle(justCopied ? Color.green : Color.secondary)
                    .animation(.easeInOut(duration: 0.15), value: justCopied)
            }
            .buttonStyle(.plain)
            .help("Copy to clipboard")

            Button {
                withAnimation {
                    manager.removeEntry(withID: entry.id)
                }
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(Color.secondary)
            }
            .buttonStyle(.plain)
            .help("Remove clip")
        }
        .padding(.vertical, 4)
    }

    private func copyEntry() {
        manager.copyToClipboard(entry.content)
        justCopied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            justCopied = false
        }
    }
}

struct NamingSheet: View {
    let clipContent: String
    let onSave: (String) -> Void
    let onCancel: () -> Void

    @State private var entryName: String

    init(
        clipContent: String,
        initialName: String,
        onSave: @escaping (String) -> Void,
        onCancel: @escaping () -> Void
    ) {
        self.clipContent = clipContent
        self.onSave = onSave
        self.onCancel = onCancel
        self._entryName = State(initialValue: initialName)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Name this clip")
                .font(.headline)

            ScrollView {
                Text(clipContent)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxHeight: 80)
            .padding(8)
            .background(Color(nsColor: .textBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 6))

            TextField("Name", text: $entryName)
                .textFieldStyle(.roundedBorder)
                .onSubmit {
                    let trimmed = entryName.trimmingCharacters(in: .whitespaces)
                    if !trimmed.isEmpty {
                        onSave(trimmed)
                    }
                }

            HStack {
                Spacer()
                Button("Cancel", action: onCancel)
                    .keyboardShortcut(.escape, modifiers: [])
                Button("Save") {
                    let trimmed = entryName.trimmingCharacters(in: .whitespaces)
                    if !trimmed.isEmpty {
                        onSave(trimmed)
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(entryName.trimmingCharacters(in: .whitespaces).isEmpty)
                .keyboardShortcut(.return, modifiers: [])
            }
        }
        .padding(20)
        .frame(width: 360)
    }
}
