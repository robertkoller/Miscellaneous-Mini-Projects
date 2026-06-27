import Foundation
import AppKit
import UserNotifications

@MainActor
final class ConversationStore: ObservableObject {
    @Published var conversations: [Conversation] = []
    @Published var selectedChatId: Int64?
    @Published var messages: [Message] = []
    @Published var isDatabaseAccessible = true
    @Published var hasMoreMessages = false
    @Published var sendError: String? = nil

    private let database = MessageDatabase()
    private let watcher = DatabaseWatcher()
    private let sender = MessageSender()
    private let contactsResolver = ContactsResolver()

    private var mutedChatIds: Set<Int64>
    private var lastSeenMessageId: [String: Int64]
    private var knownLastMessageIds: [Int64: Int64] = [:]
    private var isFirstLoad = true

    private var oldestLoadedMessageId: Int64?
    private let pageSize = 50

    // Debounce rapid FSEvents bursts (WAL writes can fire many events per second).
    private var pendingReloadTask: Task<Void, Never>?

    init() {
        let mutedArray = UserDefaults.standard.array(forKey: "MessageHub.mutedChats") as? [Int64] ?? []
        mutedChatIds = Set(mutedArray)
        lastSeenMessageId = UserDefaults.standard.dictionary(forKey: "MessageHub.lastSeenIds") as? [String: Int64] ?? [:]
        isDatabaseAccessible = database.isOpen

        reload()

        watcher.onChange = { [weak self] in
            Task { @MainActor [weak self] in
                self?.scheduleReload()
            }
        }
        let messagesDirectory = (database.databasePath as NSString).deletingLastPathComponent
        watcher.start(watching: messagesDirectory)
    }

    private func scheduleReload() {
        pendingReloadTask?.cancel()
        pendingReloadTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 800_000_000)
            guard !Task.isCancelled else { return }
            self.reload()
        }
    }

    func reload() {
        let (rawConversations, participantsByChat) = database.loadConversationsAndParticipants()
        isDatabaseAccessible = database.isOpen

        let updated: [Conversation] = rawConversations.map { raw in
            let participants = participantsByChat[raw.id] ?? []
            let lastMessage: Message? = raw.lastMessage.map { rawMsg in
                Message(
                    id: rawMsg.id,
                    guid: "",
                    text: rawMsg.text,
                    isFromMe: rawMsg.isFromMe,
                    date: rawMsg.date,
                    isRead: true,
                    senderHandle: nil,
                    hasAttachments: rawMsg.hasAttachments,
                    associatedMessageType: 0
                )
            }

            let lastSeenId = lastSeenMessageId["\(raw.id)"] ?? 0
            let effectiveUnread = (raw.lastMessage?.id ?? 0) > lastSeenId ? raw.unreadCount : 0

            return Conversation(
                id: raw.id,
                guid: raw.guid,
                displayName: raw.displayName,
                participants: participants,
                lastMessage: lastMessage,
                dbUnreadCount: effectiveUnread,
                isMuted: mutedChatIds.contains(raw.id),
                serviceName: raw.serviceName
            )
        }

        if !isFirstLoad {
            for conversation in updated {
                guard !conversation.isMuted,
                      let lastMsg = conversation.lastMessage,
                      !lastMsg.isFromMe,
                      let previousId = knownLastMessageIds[conversation.id],
                      lastMsg.id > previousId else { continue }
                postNotification(for: conversation, text: lastMsg.displayText)
            }
        }
        isFirstLoad = false

        for conversation in updated {
            if let lastMsg = conversation.lastMessage {
                knownLastMessageIds[conversation.id] = lastMsg.id
            }
        }

        conversations = updated
        updateDockBadge()

        // Append only new messages to the open thread — don't reset pagination.
        if let chatId = selectedChatId {
            appendNewMessages(for: chatId)
        }

        let allHandles = Set(updated.flatMap { $0.participants })
        contactsResolver.resolveNames(for: Array(allHandles)) { [weak self] resolved in
            guard let self else { return }
            for index in self.conversations.indices {
                let conversation = self.conversations[index]
                if conversation.displayName.isEmpty ||
                   (conversation.participants.count == 1 && conversation.displayName == conversation.participants.first) {
                    let resolvedNames = conversation.participants.compactMap { resolved[$0] }
                    if !resolvedNames.isEmpty {
                        self.conversations[index].displayName = resolvedNames.joined(separator: ", ")
                    }
                }
            }
        }
    }

    func selectConversation(_ chatId: Int64) {
        selectedChatId = chatId
        oldestLoadedMessageId = nil
        hasMoreMessages = false
        loadInitialMessages(for: chatId)
        markSeen(chatId: chatId)
    }

    // Force-clears and reloads messages for the given chat. Selects it if not already open.
    func forceRefresh(chatId: Int64) {
        selectedChatId = chatId
        messages = []
        oldestLoadedMessageId = nil
        hasMoreMessages = false
        loadInitialMessages(for: chatId)
        markSeen(chatId: chatId)
    }

    // Full initial load for a conversation: fetches the most recent `pageSize` messages.
    private func loadInitialMessages(for chatId: Int64) {
        // Fetch one extra to know whether older pages exist.
        let fetched = database.loadMessages(for: chatId, limit: pageSize + 1)
        let hasMore = fetched.count > pageSize
        let displayed = hasMore ? Array(fetched.suffix(pageSize)) : fetched

        if chatId == selectedChatId {
            messages = displayed
            hasMoreMessages = hasMore
            oldestLoadedMessageId = displayed.first?.id
        }
        if let lastMessage = displayed.last {
            markSeen(chatId: chatId, upTo: lastMessage.id)
        }
    }

    // Appends only messages newer than the current last message — called on watcher reload
    // so that scrolling position and already-loaded older messages are preserved.
    private func appendNewMessages(for chatId: Int64) {
        guard chatId == selectedChatId, let lastKnownId = messages.last?.id else { return }
        let newMessages = database.loadMessagesAfter(chatId: chatId, afterMessageId: lastKnownId)
        guard !newMessages.isEmpty else { return }
        messages.append(contentsOf: newMessages)
        if let lastMessage = newMessages.last {
            markSeen(chatId: chatId, upTo: lastMessage.id)
        }
    }

    // Loads the next page of older messages — called when the user scrolls to the top.
    func loadMoreMessages() {
        guard let chatId = selectedChatId,
              let oldestId = oldestLoadedMessageId,
              hasMoreMessages else { return }

        let fetched = database.loadMessages(for: chatId, limit: pageSize + 1, before: oldestId)
        let hasMore = fetched.count > pageSize
        let newBatch = hasMore ? Array(fetched.suffix(pageSize)) : fetched

        messages = newBatch + messages
        hasMoreMessages = hasMore
        oldestLoadedMessageId = messages.first?.id
    }

    func sendMessage(_ text: String) {
        guard let chatId = selectedChatId,
              let conversation = conversations.first(where: { $0.id == chatId }) else { return }
        let guid = conversation.guid
        if let error = sender.send(text, toChatWithGUID: guid) {
            sendError = error
            return
        }
        // Explicitly refresh after send since the watcher may lag behind imagent's write.
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 800_000_000)
            self.appendNewMessages(for: chatId)
        }
    }

    func toggleMute(chatId: Int64) {
        if mutedChatIds.contains(chatId) {
            mutedChatIds.remove(chatId)
        } else {
            mutedChatIds.insert(chatId)
        }
        UserDefaults.standard.set(Array(mutedChatIds), forKey: "MessageHub.mutedChats")
        if let index = conversations.firstIndex(where: { $0.id == chatId }) {
            conversations[index].isMuted.toggle()
        }
        updateDockBadge()
    }

    private func markSeen(chatId: Int64, upTo messageId: Int64? = nil) {
        let seenId = messageId ?? conversations.first(where: { $0.id == chatId })?.lastMessage?.id ?? 0
        guard seenId > 0 else { return }
        lastSeenMessageId["\(chatId)"] = seenId
        UserDefaults.standard.set(lastSeenMessageId, forKey: "MessageHub.lastSeenIds")
        if let index = conversations.firstIndex(where: { $0.id == chatId }) {
            conversations[index].dbUnreadCount = 0
        }
        updateDockBadge()
    }

    private func updateDockBadge() {
        let totalUnread = conversations.filter { !$0.isMuted }.reduce(0) { $0 + $1.dbUnreadCount }
        NSApp.dockTile.badgeLabel = totalUnread > 0 ? "\(totalUnread)" : nil
    }

    private func postNotification(for conversation: Conversation, text: String) {
        let content = UNMutableNotificationContent()
        content.title = conversation.effectiveDisplayName
        content.body = text
        content.sound = .default
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request)
    }
}
