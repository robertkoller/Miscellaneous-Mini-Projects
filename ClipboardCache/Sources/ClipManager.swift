import Foundation
import AppKit

struct ClipEntry: Identifiable {
    let id = UUID()
    var name: String
    let content: String
}

@MainActor
final class ClipManager: ObservableObject {
    @Published var entries: [ClipEntry] = []
    @Published var namingEnabled: Bool = false
    @Published var debugLines: [String] = []

    func log(_ message: String) {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss.SSS"
        debugLines.append("[\(formatter.string(from: Date()))] \(message)")
    }

    func autoName(for content: String) -> String {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.count <= 20 {
            return trimmed
        }
        return String(trimmed.prefix(17)) + "..."
    }

    func addEntry(content: String, name: String) {
        entries.insert(ClipEntry(name: name, content: content), at: 0)
    }

    func removeEntry(withID identifier: UUID) {
        entries.removeAll { $0.id == identifier }
    }

    func clearAll() {
        entries.removeAll()
    }

    func copyToClipboard(_ content: String) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(content, forType: .string)
    }

    func currentClipboardContent() -> String? {
        return NSPasteboard.general.string(forType: .string)
    }
}
