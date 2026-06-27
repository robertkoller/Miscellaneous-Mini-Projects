import Foundation
import AppKit

struct ClipEntry: Identifiable, Codable {
    let id: UUID
    var name: String
    var content: String

    init(name: String, content: String) {
        self.id = UUID()
        self.name = name
        self.content = content
    }
}

struct HotkeySlot: Codable {
    var slot: Int       // 1–10
    var content: String?
    var label: String?
}

struct Profile: Identifiable, Codable {
    let id: UUID
    var name: String
    var slots: [HotkeySlot]

    init(name: String) {
        self.id = UUID()
        self.name = name
        self.slots = (1...10).map { HotkeySlot(slot: $0) }
    }
}

private struct AppData: Codable {
    var entries: [ClipEntry]
    var profiles: [Profile]
    var activeProfileID: UUID?
}

@MainActor
final class ClipManager: ObservableObject {
    @Published var entries: [ClipEntry] = []
    @Published var profiles: [Profile] = []
    @Published var activeProfileID: UUID?
    @Published var namingEnabled: Bool = false
    @Published var hasAccessibilityAccess: Bool = false

    private var globalMonitor: Any?
    private let saveURL: URL

    var activeProfile: Profile? {
        profiles.first { $0.id == activeProfileID }
    }

    init() {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let dir = appSupport.appendingPathComponent("ClipboardCache", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        saveURL = dir.appendingPathComponent("data.json")

        loadData()

        if profiles.isEmpty {
            let defaultProfile = Profile(name: "Default")
            profiles.append(defaultProfile)
            activeProfileID = defaultProfile.id
            saveData()
        }

        checkAccessibilityAndSetupHotkeys()
    }

    deinit {
        if let monitor = globalMonitor {
            NSEvent.removeMonitor(monitor)
        }
    }

    // MARK: - Persistence

    private func loadData() {
        guard let data = try? Data(contentsOf: saveURL),
              let appData = try? JSONDecoder().decode(AppData.self, from: data) else { return }
        entries = appData.entries
        profiles = appData.profiles
        activeProfileID = appData.activeProfileID
        if activeProfileID == nil || !profiles.contains(where: { $0.id == activeProfileID }) {
            activeProfileID = profiles.first?.id
        }
    }

    func saveData() {
        let appData = AppData(entries: entries, profiles: profiles, activeProfileID: activeProfileID)
        guard let data = try? JSONEncoder().encode(appData) else { return }
        try? data.write(to: saveURL, options: .atomic)
    }

    // MARK: - Accessibility & Global Hotkeys

    func checkAccessibilityAndSetupHotkeys() {
        hasAccessibilityAccess = AXIsProcessTrusted()
        if hasAccessibilityAccess && globalMonitor == nil {
            setupGlobalHotkeys()
        }
    }

    func requestAccessibility() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        AXIsProcessTrustedWithOptions(options)
    }

    private func setupGlobalHotkeys() {
        // US ANSI key codes for digit keys 1–9 and 0
        let keyCodes: [UInt16: Int] = [
            18: 1, 19: 2, 20: 3, 21: 4, 23: 5,
            22: 6, 26: 7, 28: 8, 25: 9, 29: 10
        ]

        globalMonitor = NSEvent.addGlobalMonitorForEvents(matching: .keyDown) { [weak self] event in
            let mods = event.modifierFlags.intersection(.deviceIndependentFlagsMask)
            guard mods == [.command, .shift],
                  let slot = keyCodes[event.keyCode] else { return }
            Task { @MainActor [weak self] in
                self?.triggerSlot(slot)
            }
        }
    }

    // MARK: - Entries

    func autoName(for content: String) -> String {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.count <= 20 ? trimmed : String(trimmed.prefix(17)) + "..."
    }

    func addEntry(content: String, name: String) {
        entries.insert(ClipEntry(name: name, content: content), at: 0)
        saveData()
    }

    func removeEntry(withID id: UUID) {
        entries.removeAll { $0.id == id }
        saveData()
    }

    func clearAll() {
        entries.removeAll()
        saveData()
    }

    // MARK: - Profiles

    func addProfile(name: String) {
        profiles.append(Profile(name: name))
        saveData()
    }

    func deleteProfile(withID id: UUID) {
        guard profiles.count > 1 else { return }
        profiles.removeAll { $0.id == id }
        if activeProfileID == id { activeProfileID = profiles.first?.id }
        saveData()
    }

    func renameProfile(withID id: UUID, to name: String) {
        guard let idx = profiles.firstIndex(where: { $0.id == id }) else { return }
        profiles[idx].name = name
        saveData()
    }

    func setActiveProfile(_ id: UUID) {
        activeProfileID = id
        saveData()
    }

    // MARK: - Hotkey Slots

    func assignSlot(_ slot: Int, content: String, label: String) {
        guard let pIdx = profiles.firstIndex(where: { $0.id == activeProfileID }),
              let sIdx = profiles[pIdx].slots.firstIndex(where: { $0.slot == slot }) else { return }
        profiles[pIdx].slots[sIdx].content = content
        profiles[pIdx].slots[sIdx].label = label
        saveData()
    }

    func clearSlot(_ slot: Int) {
        guard let pIdx = profiles.firstIndex(where: { $0.id == activeProfileID }),
              let sIdx = profiles[pIdx].slots.firstIndex(where: { $0.slot == slot }) else { return }
        profiles[pIdx].slots[sIdx].content = nil
        profiles[pIdx].slots[sIdx].label = nil
        saveData()
    }

    func triggerSlot(_ slot: Int) {
        guard let content = activeProfile?.slots.first(where: { $0.slot == slot })?.content else { return }
        copyToClipboard(content)
    }

    // MARK: - Clipboard

    func copyToClipboard(_ content: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(content, forType: .string)
    }

    func currentClipboardContent() -> String? {
        NSPasteboard.general.string(forType: .string)
    }
}
