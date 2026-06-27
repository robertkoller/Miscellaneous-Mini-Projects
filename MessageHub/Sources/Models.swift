import Foundation

struct Conversation: Identifiable {
    let id: Int64
    let guid: String
    var displayName: String
    var participants: [String]
    let lastMessage: Message?
    var dbUnreadCount: Int
    var isMuted: Bool
    let serviceName: String

    var effectiveDisplayName: String {
        !displayName.isEmpty ? displayName : participants.joined(separator: ", ")
    }

    var isGroupChat: Bool {
        participants.count > 1
    }

    var initials: String {
        let name = effectiveDisplayName
        let words = name.split(separator: " ").prefix(2)
        if words.count >= 2 {
            return (String(words[0].prefix(1)) + String(words[1].prefix(1))).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }

    var avatarColorIndex: Int {
        Int(abs(id)) % 7
    }
}

struct Message: Identifiable {
    let id: Int64
    let guid: String
    let text: String?
    let isFromMe: Bool
    let date: Date
    let isRead: Bool
    let senderHandle: String?
    let hasAttachments: Bool
    let associatedMessageType: Int32

    var displayText: String {
        if let text = text, !text.isEmpty {
            return text
        }
        return hasAttachments ? "[Attachment]" : "[Message]"
    }
}
