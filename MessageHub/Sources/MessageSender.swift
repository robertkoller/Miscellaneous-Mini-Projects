import Foundation
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
    private var cache: [String: String] = [:]
    private var authorizationRequested = false

    func resolveNames(for handles: [String], completion: @escaping ([String: String]) -> Void) {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        if status == .notDetermined, !authorizationRequested {
            authorizationRequested = true
            CNContactStore().requestAccess(for: .contacts) { [weak self] granted, _ in
                if granted {
                    self?.fetchNames(for: handles, completion: completion)
                }
            }
        } else if status == .authorized {
            fetchNames(for: handles, completion: completion)
        }
    }

    private func fetchNames(for handles: [String], completion: @escaping ([String: String]) -> Void) {
        let cachedCopy = cache
        DispatchQueue.global(qos: .userInitiated).async {
            var resolved: [String: String] = [:]
            let store = CNContactStore()
            let keysToFetch = [
                CNContactGivenNameKey,
                CNContactFamilyNameKey,
                CNContactPhoneNumbersKey,
                CNContactEmailAddressesKey
            ] as [CNKeyDescriptor]

            for handle in handles {
                if let cached = cachedCopy[handle] {
                    resolved[handle] = cached
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
                    resolved[handle] = name
                }
            }

            DispatchQueue.main.async {
                for (handle, name) in resolved {
                    self.cache[handle] = name
                }
                completion(resolved)
            }
        }
    }
}
