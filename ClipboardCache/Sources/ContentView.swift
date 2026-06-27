import SwiftUI
import AppKit

// MARK: - Main View

struct ContentView: View {
    @EnvironmentObject private var manager: ClipManager
    @State private var alwaysOnTop = false
    @State private var showingNamingSheet = false
    @State private var pendingClipContent = ""
    @State private var showingClearConfirmation = false
    @State private var selectedTab: AppTab = .history
    @State private var showingManageProfiles = false
    @State private var slotItem: SlotItem? = nil

    enum AppTab { case history, hotkeys }

    var body: some View {
        VStack(spacing: 0) {
            headerBar
            Divider()
            if !manager.hasAccessibilityAccess {
                accessibilityBanner
                Divider()
            }
            tabPicker
            Divider()
            tabContent
            if selectedTab == .history && !manager.entries.isEmpty {
                Divider()
                footerBar
            }
        }
        .frame(minWidth: 300, minHeight: 400)
        .onReceive(NotificationCenter.default.publisher(for: NSApplication.didBecomeActiveNotification)) { _ in
            manager.checkAccessibilityAndSetupHotkeys()
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
        .sheet(isPresented: $showingManageProfiles) {
            ManageProfilesSheet(manager: manager) { showingManageProfiles = false }
        }
        .sheet(item: $slotItem) { item in
            SlotAssignSheet(slot: item.id, manager: manager) { slotItem = nil }
        }
        .confirmationDialog(
            "Clear all saved clips?",
            isPresented: $showingClearConfirmation,
            titleVisibility: .visible
        ) {
            Button("Clear All", role: .destructive) { manager.clearAll() }
            Button("Cancel", role: .cancel) {}
        }
    }

    // MARK: - Header

    private var headerBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "clipboard")
                .foregroundStyle(.tint)
            profilePicker
            Spacer()
            Button { manager.namingEnabled.toggle() } label: {
                Image(systemName: manager.namingEnabled ? "tag.fill" : "tag")
            }
            .buttonStyle(.bordered)
            .tint(manager.namingEnabled ? .blue : .secondary)
            .help(manager.namingEnabled ? "Manual naming: on" : "Auto-naming: on")

            Button {
                alwaysOnTop.toggle()
                applyWindowLevel()
            } label: {
                Image(systemName: alwaysOnTop ? "pin.fill" : "pin")
            }
            .buttonStyle(.bordered)
            .tint(alwaysOnTop ? .orange : .secondary)
            .help(alwaysOnTop ? "Always on top: on" : "Always on top: off")

            Button { saveClipboard() } label: {
                Image(systemName: "plus")
            }
            .buttonStyle(.borderedProminent)
            .help("Save current clipboard (⌘S in app, ⌘⇧C anywhere)")
            .keyboardShortcut("s", modifiers: [.command])
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }

    private var profilePicker: some View {
        Menu {
            ForEach(manager.profiles) { profile in
                Button {
                    manager.setActiveProfile(profile.id)
                } label: {
                    if profile.id == manager.activeProfileID {
                        Label(profile.name, systemImage: "checkmark")
                    } else {
                        Text(profile.name)
                    }
                }
            }
            Divider()
            Button("Manage Profiles...") { showingManageProfiles = true }
        } label: {
            HStack(spacing: 3) {
                Text(manager.activeProfile?.name ?? "Default")
                    .font(.subheadline.weight(.medium))
                Image(systemName: "chevron.up.chevron.down")
                    .font(.caption2)
            }
        }
        .menuStyle(.borderlessButton)
        .fixedSize()
    }

    // MARK: - Accessibility Banner

    private var accessibilityBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "keyboard")
                .foregroundStyle(.orange)
            Text("Grant Accessibility access to enable global hotkeys")
                .font(.caption)
                .foregroundStyle(.secondary)
            Spacer()
            Button("Grant") { manager.requestAccessibility() }
                .buttonStyle(.bordered)
                .controlSize(.small)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.orange.opacity(0.08))
    }

    // MARK: - Tab Picker

    private var tabPicker: some View {
        HStack(spacing: 4) {
            tabButton("History", tab: .history, icon: "clock")
            tabButton("Hotkeys", tab: .hotkeys, icon: "keyboard")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }

    private func tabButton(_ title: String, tab: AppTab, icon: String) -> some View {
        Button {
            selectedTab = tab
        } label: {
            Label(title, systemImage: icon)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 5)
                .background(
                    selectedTab == tab
                        ? Color.accentColor.opacity(0.15)
                        : Color.clear
                )
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
        .foregroundStyle(selectedTab == tab ? Color.primary : Color.secondary)
    }

    // MARK: - Tab Content

    @ViewBuilder
    private var tabContent: some View {
        switch selectedTab {
        case .history: historyView
        case .hotkeys: hotkeysView
        }
    }

    private var historyView: some View {
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

    private var hotkeysView: some View {
        List {
            ForEach(
                (manager.activeProfile?.slots ?? []).sorted(by: { $0.slot < $1.slot }),
                id: \.slot
            ) { slotData in
                HotkeySlotRow(
                    slotData: slotData,
                    onAssign: { slotItem = SlotItem(id: slotData.slot) },
                    onClear: { manager.clearSlot(slotData.slot) }
                )
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Footer

    private var footerBar: some View {
        HStack {
            Spacer()
            Button("Clear All") { showingClearConfirmation = true }
                .buttonStyle(.bordered)
                .tint(.red)
            Spacer()
        }
        .padding(10)
    }

    // MARK: - Actions

    private func saveClipboard() {
        guard let content = manager.currentClipboardContent(), !content.isEmpty else { return }
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

// MARK: - Supporting Types

struct SlotItem: Identifiable {
    let id: Int
}

// MARK: - History Row

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
            Button { copyEntry() } label: {
                Image(systemName: justCopied ? "checkmark" : "clipboard")
                    .foregroundStyle(justCopied ? Color.green : Color.secondary)
                    .animation(.easeInOut(duration: 0.15), value: justCopied)
            }
            .buttonStyle(.plain)
            .help("Copy to clipboard")

            Button {
                withAnimation { manager.removeEntry(withID: entry.id) }
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
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { justCopied = false }
    }
}

// MARK: - Hotkey Slot Row

struct HotkeySlotRow: View {
    let slotData: HotkeySlot
    let onAssign: () -> Void
    let onClear: () -> Void

    private var shortcutLabel: String {
        "⌘⇧\(slotData.slot == 10 ? "0" : "\(slotData.slot)")"
    }

    var body: some View {
        HStack(spacing: 10) {
            Text(shortcutLabel)
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(.secondary)
                .frame(width: 40, alignment: .leading)

            VStack(alignment: .leading, spacing: 2) {
                if let label = slotData.label {
                    Text(label)
                        .font(.body)
                        .lineLimit(1)
                    if let content = slotData.content, content != label {
                        Text(content)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                } else {
                    Text("Empty")
                        .foregroundStyle(.tertiary)
                        .italic()
                }
            }

            Spacer()

            Button(action: onAssign) {
                Image(systemName: "square.and.pencil")
            }
            .buttonStyle(.plain)
            .foregroundStyle(.secondary)
            .help("Assign clip to this slot")

            Button(action: onClear) {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(slotData.content != nil ? Color.secondary : Color.clear)
            }
            .buttonStyle(.plain)
            .disabled(slotData.content == nil)
            .help("Clear this slot")
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Slot Assign Sheet

struct SlotAssignSheet: View {
    let slot: Int
    let manager: ClipManager
    let onDismiss: () -> Void

    private var shortcutLabel: String {
        "⌘⇧\(slot == 10 ? "0" : "\(slot)")"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Assign \(shortcutLabel)")
                .font(.headline)

            if let clipboard = manager.currentClipboardContent(), !clipboard.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Current clipboard")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                    Button {
                        manager.assignSlot(slot, content: clipboard, label: manager.autoName(for: clipboard))
                        onDismiss()
                    } label: {
                        HStack {
                            Text(clipboard)
                                .lineLimit(2)
                                .font(.caption)
                                .multilineTextAlignment(.leading)
                            Spacer()
                            Image(systemName: "plus.circle.fill")
                                .foregroundStyle(.tint)
                        }
                        .padding(8)
                        .background(Color.accentColor.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    .buttonStyle(.plain)
                }
            }

            if !manager.entries.isEmpty {
                Divider()
                Text("From history")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                List {
                    ForEach(manager.entries) { entry in
                        Button {
                            manager.assignSlot(slot, content: entry.content, label: entry.name)
                            onDismiss()
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(entry.name)
                                        .font(.body)
                                    if entry.content != entry.name {
                                        Text(entry.content)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                            .lineLimit(1)
                                    }
                                }
                                Spacer()
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .listStyle(.plain)
            }

            HStack {
                Spacer()
                Button("Cancel", action: onDismiss)
                    .keyboardShortcut(.escape, modifiers: [])
            }
        }
        .padding(20)
        .frame(width: 380, height: 420)
    }
}

// MARK: - Manage Profiles Sheet

struct ManageProfilesSheet: View {
    @ObservedObject var manager: ClipManager
    let onDismiss: () -> Void
    @State private var editingID: UUID? = nil
    @State private var editText = ""
    @State private var showingAddProfile = false
    @State private var newProfileName = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Manage Profiles")
                .font(.headline)

            List {
                ForEach(manager.profiles) { profile in
                    HStack {
                        if editingID == profile.id {
                            TextField("Name", text: $editText)
                                .textFieldStyle(.roundedBorder)
                                .onSubmit { commitRename(profile.id) }
                        } else {
                            Text(profile.name)
                            if profile.id == manager.activeProfileID {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(.tint)
                                    .font(.caption)
                            }
                        }
                        Spacer()
                        if editingID == profile.id {
                            Button("Save") { commitRename(profile.id) }
                                .buttonStyle(.plain)
                                .foregroundStyle(.tint)
                        } else {
                            Button {
                                editText = profile.name
                                editingID = profile.id
                            } label: {
                                Image(systemName: "pencil")
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(.secondary)
                        }
                        Button {
                            manager.deleteProfile(withID: profile.id)
                        } label: {
                            Image(systemName: "trash")
                                .foregroundStyle(manager.profiles.count > 1 ? Color.red : Color.secondary)
                        }
                        .buttonStyle(.plain)
                        .disabled(manager.profiles.count <= 1)
                    }
                    .padding(.vertical, 2)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        if editingID == nil {
                            manager.setActiveProfile(profile.id)
                        }
                    }
                }
            }
            .listStyle(.plain)
            .frame(minHeight: 120)

            if showingAddProfile {
                HStack {
                    TextField("Profile name", text: $newProfileName)
                        .textFieldStyle(.roundedBorder)
                        .onSubmit { commitAddProfile() }
                    Button("Add") { commitAddProfile() }
                        .disabled(newProfileName.trimmingCharacters(in: .whitespaces).isEmpty)
                    Button("Cancel") {
                        showingAddProfile = false
                        newProfileName = ""
                    }
                }
            } else {
                Button("+ Add Profile") { showingAddProfile = true }
                    .foregroundStyle(.tint)
            }

            HStack {
                Spacer()
                Button("Done", action: onDismiss)
                    .buttonStyle(.borderedProminent)
                    .keyboardShortcut(.return, modifiers: [])
            }
        }
        .padding(20)
        .frame(width: 340, minHeight: 320)
    }

    private func commitRename(_ id: UUID) {
        let trimmed = editText.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty { manager.renameProfile(withID: id, to: trimmed) }
        editingID = nil
    }

    private func commitAddProfile() {
        let trimmed = newProfileName.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        manager.addProfile(name: trimmed)
        newProfileName = ""
        showingAddProfile = false
    }
}

// MARK: - Naming Sheet

struct NamingSheet: View {
    let clipContent: String
    let onSave: (String) -> Void
    let onCancel: () -> Void
    @State private var entryName: String

    init(clipContent: String, initialName: String, onSave: @escaping (String) -> Void, onCancel: @escaping () -> Void) {
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
                    if !trimmed.isEmpty { onSave(trimmed) }
                }

            HStack {
                Spacer()
                Button("Cancel", action: onCancel)
                    .keyboardShortcut(.escape, modifiers: [])
                Button("Save") {
                    let trimmed = entryName.trimmingCharacters(in: .whitespaces)
                    if !trimmed.isEmpty { onSave(trimmed) }
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
