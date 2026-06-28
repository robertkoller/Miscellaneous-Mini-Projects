import Foundation
import AppKit
import Contacts

struct MessageSender {
    // Returns nil on success, a human-readable error string on failure.
    func send(_ text: String, toChatWithGUID guid: String) -> String? {
        let sanitized = text
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")

        // Use the by-ID specifier for all chat types. The chat.guid in chat.db is
        // the same value Messages uses as the chat's id property. The "whose id is"
        // filter form (errAEBadKeyForm) is not supported — "chat id" is.
        let script = """
        tell application "Messages"
            set targetChat to chat id "\(guid)"
            send "\(sanitized)" to targetChat
        end tell
        """

        var errorInfo: NSDictionary?
        NSAppleScript(source: script)?.executeAndReturnError(&errorInfo)

        guard let errorInfo else { return nil }

        let errorCode = errorInfo["NSAppleScriptErrorNumber"] as? Int ?? 0
        let errorMessage = errorInfo["NSAppleScriptErrorMessage"] as? String ?? "Unknown AppleScript error"

        // Error -1743 means Automation permission was denied.
        if errorCode == -1743 || errorMessage.lowercased().contains("not authorized") {
            return "MessageHub needs permission to control Messages.\n\nGo to System Settings → Privacy & Security → Automation → MessageHub → turn on Messages."
        }

        return errorMessage
    }
}

final class ContactsResolver {
    private var nameCache: [String: String] = [:]
    private var photoCache: [String: NSImage] = [:]
    private var authorizationRequested = false

    func resolveNamesAndPhotos(
        for handles: [String],
        completion: @escaping ([String: String], [String: NSImage]) -> Void
    ) {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        if status == .notDetermined, !authorizationRequested {
            authorizationRequested = true
            CNContactStore().requestAccess(for: .contacts) { [weak self] granted, _ in
                if granted {
                    self?.fetchNamesAndPhotos(for: handles, completion: completion)
                }
            }
        } else if status == .authorized {
            fetchNamesAndPhotos(for: handles, completion: completion)
        }
    }

    private func fetchNamesAndPhotos(
        for handles: [String],
        completion: @escaping ([String: String], [String: NSImage]) -> Void
    ) {
        let cachedNames = nameCache
        let cachedPhotos = photoCache
        DispatchQueue.global(qos: .userInitiated).async {
            var resolvedNames: [String: String] = [:]
            var resolvedPhotos: [String: NSImage] = [:]
            let store = CNContactStore()
            let keysToFetch = [
                CNContactGivenNameKey,
                CNContactFamilyNameKey,
                CNContactPhoneNumbersKey,
                CNContactEmailAddressesKey,
                CNContactThumbnailImageDataKey
            ] as [CNKeyDescriptor]

            for handle in handles {
                if let cached = cachedNames[handle] {
                    resolvedNames[handle] = cached
                }
                if let cachedPhoto = cachedPhotos[handle] {
                    resolvedPhotos[handle] = cachedPhoto
                }
                if cachedNames[handle] != nil && cachedPhotos[handle] != nil {
                    continue
                }

                let predicate: NSPredicate
                if handle.contains("@") {
                    predicate = CNContact.predicateForContacts(matchingEmailAddress: handle)
                } else {
                    predicate = CNContact.predicateForContacts(matching: CNPhoneNumber(stringValue: handle))
                }

                guard let contacts = try? store.unifiedContacts(matching: predicate, keysToFetch: keysToFetch),
                      let contact = contacts.first else { continue }

                let name = [contact.givenName, contact.familyName]
                    .filter { !$0.isEmpty }
                    .joined(separator: " ")
                if !name.isEmpty {
                    resolvedNames[handle] = name
                }

                if let imageData = contact.thumbnailImageData,
                   let image = NSImage(data: imageData) {
                    resolvedPhotos[handle] = image
                }
            }

            DispatchQueue.main.async {
                for (handle, name) in resolvedNames {
                    self.nameCache[handle] = name
                }
                for (handle, photo) in resolvedPhotos {
                    self.photoCache[handle] = photo
                }
                completion(resolvedNames, resolvedPhotos)
            }
        }
    }
}
