import Foundation
import SQLite3
import CoreServices
import MessageHubObjC

// Apple's CoreData reference date is Jan 1 2001 00:00:00 UTC
private let appleEpochOffset: TimeInterval = 978307200

func dateFromAppleTimestamp(_ timestamp: Int64) -> Date {
    // Modern macOS stores timestamps as nanoseconds; older versions used seconds.
    // Values above 10 billion indicate nanoseconds.
    let seconds: Double
    if timestamp > 10_000_000_000 {
        seconds = Double(timestamp) / 1_000_000_000.0
    } else {
        seconds = Double(timestamp)
    }
    return Date(timeIntervalSince1970: appleEpochOffset + seconds)
}

final class DatabaseWatcher {
    var onChange: (() -> Void)?
    private var stream: FSEventStreamRef?

    func start(watching directoryPath: String) {
        let pathsToWatch = [directoryPath] as CFArray

        let callback: FSEventStreamCallback = { _, clientInfo, _, _, _, _ in
            guard let clientInfo else { return }
            let watcher = Unmanaged<DatabaseWatcher>.fromOpaque(clientInfo).takeUnretainedValue()
            DispatchQueue.main.async { watcher.onChange?() }
        }

        var context = FSEventStreamContext(
            version: 0,
            info: Unmanaged.passUnretained(self).toOpaque(),
            retain: nil,
            release: nil,
            copyDescription: nil
        )

        stream = FSEventStreamCreate(
            nil,
            callback,
            &context,
            pathsToWatch,
            FSEventStreamEventId(kFSEventStreamEventIdSinceNow),
            0.75,
            0
        )

        if let stream {
            FSEventStreamSetDispatchQueue(stream, .main)
            FSEventStreamStart(stream)
        }
    }

    func stop() {
        guard let stream else { return }
        FSEventStreamStop(stream)
        FSEventStreamInvalidate(stream)
        FSEventStreamRelease(stream)
        self.stream = nil
    }

    deinit { stop() }
}

struct RawConversation {
    let id: Int64
    let guid: String
    let displayName: String
    let serviceName: String
    let lastMessage: RawMessage?
    let unreadCount: Int
}

struct RawMessage {
    let id: Int64
    let text: String?
    let date: Date
    let isFromMe: Bool
    let hasAttachments: Bool
}

final class MessageDatabase {
    let databasePath: String
    private var db: OpaquePointer?
    private var debugLogCount = 0

    init() {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        databasePath = "\(home)/Library/Messages/chat.db"
        openDatabase()
    }

    var isOpen: Bool { db != nil }

    private func openDatabase() {
        if let existingDb = db {
            sqlite3_close(existingDb)
            db = nil
        }
        let flags = SQLITE_OPEN_READONLY | SQLITE_OPEN_FULLMUTEX
        if sqlite3_open_v2(databasePath, &db, flags, nil) == SQLITE_OK {
            sqlite3_busy_timeout(db, 1000)
        } else {
            db = nil
        }
    }

    private func ensureOpen() -> Bool {
        if db != nil { return true }
        openDatabase()
        return db != nil
    }

    func loadConversationsAndParticipants() -> ([RawConversation], [Int64: [String]]) {
        guard ensureOpen() else { return ([], [:]) }
        return (queryConversations(), queryAllParticipants())
    }

    private func queryConversations() -> [RawConversation] {
        // The unread count is a single aggregated JOIN instead of a correlated subquery
        // per row, which scales much better for large chat histories.
        let sql = """
        SELECT
            c.rowid,
            c.guid,
            COALESCE(c.display_name, '') as display_name,
            COALESCE(c.service_name, 'iMessage') as service_name,
            m.rowid as msg_rowid,
            m.text as msg_text,
            m.date as msg_date,
            COALESCE(m.is_from_me, 0) as is_from_me,
            COALESCE(m.cache_has_attachments, 0) as has_attachments,
            COALESCE(unread.unread_count, 0) as unread_count
        FROM chat c
        LEFT JOIN (
            SELECT cmj.chat_id, MAX(cmj.message_id) as latest_id
            FROM chat_message_join cmj
            GROUP BY cmj.chat_id
        ) latest ON c.rowid = latest.chat_id
        LEFT JOIN message m ON m.rowid = latest.latest_id
        LEFT JOIN (
            SELECT ucmj.chat_id, COUNT(*) as unread_count
            FROM message um
            JOIN chat_message_join ucmj ON um.rowid = ucmj.message_id
            WHERE um.is_read = 0
            AND um.is_from_me = 0
            AND (um.associated_message_type IS NULL OR um.associated_message_type = 0)
            GROUP BY ucmj.chat_id
        ) unread ON c.rowid = unread.chat_id
        WHERE c.is_archived = 0
        ORDER BY COALESCE(m.date, 0) DESC
        """

        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { return [] }
        defer { sqlite3_finalize(statement) }

        var results: [RawConversation] = []
        while sqlite3_step(statement) == SQLITE_ROW {
            let chatId = sqlite3_column_int64(statement, 0)
            let guid = columnString(statement, 1) ?? ""
            let displayName = columnString(statement, 2) ?? ""
            let serviceName = columnString(statement, 3) ?? "iMessage"
            let msgRowid = sqlite3_column_int64(statement, 4)
            let msgText = columnString(statement, 5)
            let msgTimestamp = sqlite3_column_int64(statement, 6)
            let isFromMe = sqlite3_column_int(statement, 7) == 1
            let hasAttachments = sqlite3_column_int(statement, 8) == 1
            let unreadCount = Int(sqlite3_column_int(statement, 9))

            let lastMessage: RawMessage? = msgRowid > 0 ? RawMessage(
                id: msgRowid,
                text: msgText,
                date: dateFromAppleTimestamp(msgTimestamp),
                isFromMe: isFromMe,
                hasAttachments: hasAttachments
            ) : nil

            results.append(RawConversation(
                id: chatId,
                guid: guid,
                displayName: displayName,
                serviceName: serviceName,
                lastMessage: lastMessage,
                unreadCount: unreadCount
            ))
        }
        return results
    }

    private func queryAllParticipants() -> [Int64: [String]] {
        let sql = """
        SELECT chj.chat_id, h.id
        FROM chat_handle_join chj
        JOIN handle h ON chj.handle_id = h.rowid
        """

        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { return [:] }
        defer { sqlite3_finalize(statement) }

        var results: [Int64: [String]] = [:]
        while sqlite3_step(statement) == SQLITE_ROW {
            let chatId = sqlite3_column_int64(statement, 0)
            let handle = columnString(statement, 1) ?? ""
            results[chatId, default: []].append(handle)
        }
        return results
    }

    // Loads up to `limit` messages ending at the most recent, or ending just before
    // `before` if provided (cursor-based pagination). Results are in ascending date order.
    func loadMessages(for chatId: Int64, limit: Int, before messageId: Int64? = nil) -> [Message] {
        guard ensureOpen() else { return [] }

        // messageId is a typed Int64 (not user input) so interpolation is safe.
        let beforeClause = messageId.map { "AND m.rowid < \($0)" } ?? ""

        let sql = """
        SELECT
            m.rowid, m.guid, m.text, m.attributedBody, m.date,
            COALESCE(m.is_from_me, 0) as is_from_me,
            COALESCE(m.is_read, 0) as is_read,
            COALESCE(m.cache_has_attachments, 0) as has_attachments,
            COALESCE(m.associated_message_type, 0) as assoc_type,
            h.id as sender_handle
        FROM message m
        JOIN chat_message_join cmj ON m.rowid = cmj.message_id
        LEFT JOIN handle h ON m.handle_id = h.rowid
        WHERE cmj.chat_id = ?
        AND (m.associated_message_type IS NULL OR m.associated_message_type = 0)
        \(beforeClause)
        ORDER BY m.date DESC
        LIMIT ?
        """

        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { return [] }
        defer { sqlite3_finalize(statement) }

        sqlite3_bind_int64(statement, 1, chatId)
        sqlite3_bind_int64(statement, 2, Int64(limit))

        var messages: [Message] = []
        while sqlite3_step(statement) == SQLITE_ROW {
            messages.append(rowToMessage(statement))
        }
        // Query returns newest-first; reverse to get chronological order.
        return messages.reversed()
    }

    // Loads all messages newer than `afterMessageId` in ascending order.
    // Used for incremental refresh when the watcher detects a DB change.
    func loadMessagesAfter(chatId: Int64, afterMessageId: Int64) -> [Message] {
        guard ensureOpen() else { return [] }

        let sql = """
        SELECT
            m.rowid, m.guid, m.text, m.attributedBody, m.date,
            COALESCE(m.is_from_me, 0) as is_from_me,
            COALESCE(m.is_read, 0) as is_read,
            COALESCE(m.cache_has_attachments, 0) as has_attachments,
            COALESCE(m.associated_message_type, 0) as assoc_type,
            h.id as sender_handle
        FROM message m
        JOIN chat_message_join cmj ON m.rowid = cmj.message_id
        LEFT JOIN handle h ON m.handle_id = h.rowid
        WHERE cmj.chat_id = ?
        AND m.rowid > ?
        AND (m.associated_message_type IS NULL OR m.associated_message_type = 0)
        ORDER BY m.date ASC
        """

        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else { return [] }
        defer { sqlite3_finalize(statement) }

        sqlite3_bind_int64(statement, 1, chatId)
        sqlite3_bind_int64(statement, 2, afterMessageId)

        var messages: [Message] = []
        while sqlite3_step(statement) == SQLITE_ROW {
            messages.append(rowToMessage(statement))
        }
        return messages
    }

    private func rowToMessage(_ statement: OpaquePointer?) -> Message {
        let rowid = sqlite3_column_int64(statement, 0)
        let guid = columnString(statement, 1) ?? ""
        var text = columnString(statement, 2)
        let attributedBodyData = columnData(statement, 3)
        let timestamp = sqlite3_column_int64(statement, 4)
        let isFromMe = sqlite3_column_int(statement, 5) == 1
        let isRead = sqlite3_column_int(statement, 6) == 1
        let hasAttachments = sqlite3_column_int(statement, 7) == 1
        let associatedType = sqlite3_column_int(statement, 8)
        let senderHandle = columnString(statement, 9)

        if (text == nil || text!.isEmpty), let data = attributedBodyData {
            text = extractText(fromAttributedBody: data)
        }

        return Message(
            id: rowid,
            guid: guid,
            text: text,
            isFromMe: isFromMe,
            date: dateFromAppleTimestamp(timestamp),
            isRead: isRead,
            senderHandle: senderHandle,
            hasAttachments: hasAttachments,
            associatedMessageType: associatedType
        )
    }

    private func extractText(fromAttributedBody data: Data) -> String? {
        // Method 1: Secure NSKeyedUnarchiver (bplist format, modern macOS).
        if let attributed = try? NSKeyedUnarchiver.unarchivedObject(
            ofClass: NSAttributedString.self, from: data
        ), !attributed.string.isEmpty {
            return attributed.string
        }

        // Method 2: Non-secure NSKeyedUnarchiver — handles NSMutableAttributedString
        // and older bplist-format messages with private root classes.
        if let unarchiver = try? NSKeyedUnarchiver(forReadingFrom: data) {
            unarchiver.requiresSecureCoding = false
            if let attributed = unarchiver.decodeObject(
                forKey: NSKeyedArchiveRootObjectKey
            ) as? NSAttributedString, !attributed.string.isEmpty {
                return attributed.string
            }
        }

        // Method 3: NSKeyedArchiver $objects binary plist scan (handles the case
        // where the root class is a private IMCore type but NSString is still accessible).
        if let result = extractStringFromArchiveStructure(data) {
            return result
        }

        // Method 4: Old NSArchiver / NSTypedStream format (magic bytes 04 0b).
        // NSUnarchiver can read this format but throws NSExceptions on unknown classes;
        // the ObjC wrapper catches those safely.
        if let text = SafeUnarchiveAttributedString(data), !text.isEmpty {
            return text
        }

        // Method 5: Raw length-prefix scan. Used when the archive format is unknown
        // or when NSUnarchiver throws because of private iMessage subclasses. The plain
        // text bytes are still present in the buffer with a 1-byte length prefix.
        let result = extractTextByRawScan(data)

        if result == nil, debugLogCount < 3 {
            debugLogCount += 1
            writeDebugLog(for: data, sampleIndex: debugLogCount)
        }

        return result
    }

    private func extractTextByRawScan(_ data: Data) -> String? {
        // In NSTypedStream and similar compact formats, strings are stored as a
        // 1-byte length prefix followed by the UTF-8 content. We scan every byte
        // offset and return the longest candidate that looks like real message text.
        let bytes = Array(data)
        let count = bytes.count
        var bestCandidate = ""

        for offset in 0..<count {
            let length = Int(bytes[offset])
            guard length >= 3, length < 200 else { continue }
            guard offset + 1 + length <= count else { continue }

            let slice = Array(bytes[(offset + 1)..<(offset + 1 + length)])
            guard let text = String(bytes: slice, encoding: .utf8) else { continue }
            guard isPlausibleMessageText(text) else { continue }

            if text.count > bestCandidate.count {
                bestCandidate = text
            }
        }

        return bestCandidate.isEmpty ? nil : bestCandidate
    }

    private func isPlausibleMessageText(_ text: String) -> Bool {
        guard text.count >= 3 else { return false }
        // Filter out ObjC class names and archive metadata strings.
        let knownMetadata: Set<String> = [
            "stream", "typedstream", "i", "c", "v", "I", "C", "d", "f", "B",
            "NSString", "NSMutableString", "NSAttributedString", "NSMutableAttributedString",
            "NSObject", "NSColor", "NSFont", "NSParagraphStyle", "NSShadow",
            "NSTextAttachment", "NSMutableArray", "NSArray", "NSDictionary",
            "NSMutableDictionary", "IMMessage", "IMMessagePart", "IMTextMessagePart",
            "IMBaseMessagePart", "root"
        ]
        guard !knownMetadata.contains(text) else { return false }
        let classNamePrefixes = ["NS", "IM", "CK", "UI", "AK", "AB", "CF", "CA", "MK"]
        for prefix in classNamePrefixes {
            if text.hasPrefix(prefix) { return false }
        }
        // Must contain at least one character that isn't pure uppercase ASCII (class name pattern).
        let hasNonUppercase = text.contains { !$0.isUppercase || !$0.isASCII }
        return hasNonUppercase
    }

    private func writeDebugLog(for data: Data, sampleIndex: Int) {
        var lines: [String] = ["=== Sample \(sampleIndex) (size \(data.count)) ==="]
        let magicBytes = data.prefix(8).map { String(format: "%02x", $0) }.joined(separator: " ")
        lines.append("magic: \(magicBytes)")

        if let plist = try? PropertyListSerialization.propertyList(
            from: data, options: [], format: nil
        ) as? NSDictionary {
            let topKeys = (plist.allKeys as? [String] ?? []).sorted().joined(separator: ", ")
            lines.append("top-level keys: \(topKeys)")

            if let objects = plist["$objects"] as? NSArray {
                lines.append("$objects count: \(objects.count)")
                for (objectIndex, obj) in objects.enumerated() {
                    if let string = obj as? NSString {
                        let preview = (string as String).prefix(100)
                        lines.append("  [\(objectIndex)] String: \"\(preview)\"")
                    } else if let dict = obj as? NSDictionary {
                        let keys = (dict.allKeys as? [String] ?? []).sorted().joined(separator: ", ")
                        lines.append("  [\(objectIndex)] Dict { \(keys) }")
                        for key in (dict.allKeys as? [String] ?? []).sorted() {
                            let val = dict[key]
                            if let string = val as? NSString {
                                lines.append("    \(key) = \"\(string)\"")
                            } else if let number = val as? NSNumber {
                                lines.append("    \(key) = \(number)")
                            } else if let refDict = val as? NSDictionary,
                                      let uid = refDict["CF$UID"] as? NSNumber {
                                lines.append("    \(key) = {CF$UID: \(uid)}")
                            } else {
                                lines.append("    \(key) = <\(type(of: val as Any))>")
                            }
                        }
                    } else {
                        lines.append("  [\(objectIndex)] \(type(of: obj))")
                    }
                }
            } else {
                lines.append("$objects missing or not NSArray")
            }
        } else {
            lines.append("PropertyListSerialization FAILED — not a valid plist")
        }

        let content = lines.joined(separator: "\n") + "\n\n"
        let desktopPath = URL(fileURLWithPath: NSHomeDirectory())
            .appendingPathComponent("Desktop/MessageHubDebug.txt")
        let contentData = content.data(using: .utf8) ?? Data()
        if let existing = try? Data(contentsOf: desktopPath) {
            try? (existing + contentData).write(to: desktopPath)
        } else {
            try? contentData.write(to: desktopPath)
        }
    }

    private func extractStringFromArchiveStructure(_ data: Data) -> String? {
        // Use NSDictionary/NSArray directly to avoid Swift bridging edge cases.
        guard let plist = try? PropertyListSerialization.propertyList(
            from: data, options: [], format: nil
        ) as? NSDictionary,
        let objects = plist["$objects"] as? NSArray,
        objects.count > 1 else { return nil }

        // iMessage wraps NSAttributedString inside proprietary objects so the
        // NSAttributedString node is NOT always at $objects[1]. Scan every object
        // for a dict containing "NSString" (the NSAttributedString's text ref key).
        for case let dictionary as NSDictionary in objects {
            guard let nsStringRef = dictionary["NSString"] else { continue }

            // CF$UID values from PropertyListSerialization arrive as NSDictionary {"CF$UID": NSNumber}.
            let resolvedIndex: Int
            if let number = nsStringRef as? NSNumber {
                resolvedIndex = number.intValue
            } else if let refDictionary = nsStringRef as? NSDictionary,
                      let uid = refDictionary["CF$UID"] as? NSNumber {
                resolvedIndex = uid.intValue
            } else {
                continue
            }

            guard resolvedIndex > 0,
                  resolvedIndex < objects.count,
                  let text = objects[resolvedIndex] as? NSString,
                  text.length > 0 else { continue }
            return text as String
        }

        // Last resort: walk $objects for the first string that doesn't look like
        // a class name or metadata key.
        let knownNonContent: Set<String> = [
            "$null", "root", "NSString", "NSMutableString",
            "NSAttributedString", "NSMutableAttributedString",
            "NSColor", "NSFont", "NSParagraphStyle", "NSShadow", "NSTextAttachment"
        ]
        for case let text as NSString in objects {
            let swiftText = text as String
            guard !swiftText.isEmpty,
                  !knownNonContent.contains(swiftText),
                  !swiftText.hasPrefix("NS"),
                  !swiftText.hasPrefix("IM"),
                  !swiftText.hasPrefix("$"),
                  !swiftText.hasPrefix("UI"),
                  !swiftText.hasPrefix("CK") else { continue }
            return swiftText
        }
        return nil
    }

    private func columnString(_ statement: OpaquePointer?, _ index: Int32) -> String? {
        guard let cString = sqlite3_column_text(statement, index) else { return nil }
        return String(cString: cString)
    }

    private func columnData(_ statement: OpaquePointer?, _ index: Int32) -> Data? {
        guard let bytes = sqlite3_column_blob(statement, index) else { return nil }
        let length = sqlite3_column_bytes(statement, index)
        return Data(bytes: bytes, count: Int(length))
    }
}
