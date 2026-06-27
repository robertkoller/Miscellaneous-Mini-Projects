import SwiftUI

struct MessageThreadView: View {
    let conversation: Conversation
    @EnvironmentObject private var store: ConversationStore
    @State private var inputText = ""
    @State private var scrollAnchorId: Int64? = nil
    @State private var isLoadingMore = false

    var body: some View {
        VStack(spacing: 0) {
            threadHeader
            Divider()
            messageList
            Divider()
            inputBar
        }
        .alert("Send Failed", isPresented: Binding(
            get: { store.sendError != nil },
            set: { if !$0 { store.sendError = nil } }
        )) {
            Button("OK") { store.sendError = nil }
        } message: {
            Text(store.sendError ?? "")
        }
    }

    private var threadHeader: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(conversation.effectiveDisplayName)
                    .font(.headline)
                if conversation.isGroupChat {
                    Text("\(conversation.participants.count) participants")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            Button {
                store.forceRefresh(chatId: conversation.id)
            } label: {
                Image(systemName: "arrow.clockwise")
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .help("Reload messages")
            Button {
                store.toggleMute(chatId: conversation.id)
            } label: {
                Image(systemName: conversation.isMuted ? "bell.slash.fill" : "bell.fill")
                    .foregroundStyle(conversation.isMuted ? .secondary : .primary)
            }
            .buttonStyle(.plain)
            .help(conversation.isMuted ? "Unmute conversation" : "Mute conversation")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 11)
    }

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 2) {
                    // Appears at the top of the list. When the user scrolls here,
                    // load the next page of older messages.
                    if store.hasMoreMessages {
                        loadMoreTrigger(proxy: proxy)
                    }
                    ForEach(store.messages) { message in
                        MessageBubble(
                            message: message,
                            showSenderName: conversation.isGroupChat && !message.isFromMe
                        )
                        .id(message.id)
                    }
                }
                .padding(.vertical, 12)
                .padding(.horizontal, 12)
            }
            .onAppear {
                scrollToBottom(proxy: proxy)
            }
            .onChange(of: store.messages.count) { _ in
                if let anchorId = scrollAnchorId {
                    // Messages were prepended (load more) — restore position.
                    DispatchQueue.main.async {
                        proxy.scrollTo(anchorId, anchor: .top)
                        scrollAnchorId = nil
                    }
                } else {
                    // Messages were appended (new message) — follow to bottom.
                    scrollToBottom(proxy: proxy)
                }
            }
        }
    }

    @ViewBuilder
    private func loadMoreTrigger(proxy: ScrollViewProxy) -> some View {
        HStack {
            Spacer()
            ProgressView()
                .scaleEffect(0.7)
                .opacity(isLoadingMore ? 1 : 0)
            Spacer()
        }
        .frame(height: 32)
        .onAppear {
            guard !isLoadingMore, store.hasMoreMessages else { return }
            isLoadingMore = true
            scrollAnchorId = store.messages.first?.id
            store.loadMoreMessages()
            isLoadingMore = false
        }
    }

    private var inputBar: some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField("iMessage", text: $inputText, axis: .vertical)
                .textFieldStyle(.plain)
                .lineLimit(1...6)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color.secondary.opacity(0.35), lineWidth: 1)
                )
                .onSubmit {
                    sendIfNotEmpty()
                }

            Button {
                sendIfNotEmpty()
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 30))
                    .foregroundStyle(
                        inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ? AnyShapeStyle(.secondary)
                            : AnyShapeStyle(Color.blue)
                    )
            }
            .buttonStyle(.plain)
            .disabled(inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .padding(.bottom, 1)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
    }

    private func sendIfNotEmpty() {
        let trimmed = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        store.sendMessage(trimmed)
        inputText = ""
    }

    private func scrollToBottom(proxy: ScrollViewProxy) {
        guard let lastId = store.messages.last?.id else { return }
        withAnimation(.easeOut(duration: 0.15)) {
            proxy.scrollTo(lastId, anchor: .bottom)
        }
    }
}

struct MessageBubble: View {
    let message: Message
    let showSenderName: Bool

    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter
    }()

    var body: some View {
        VStack(alignment: message.isFromMe ? .trailing : .leading, spacing: 2) {
            if showSenderName, let handle = message.senderHandle {
                Text(handle)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 6)
            }
            HStack(alignment: .bottom, spacing: 0) {
                if message.isFromMe { Spacer(minLength: 64) }
                VStack(alignment: message.isFromMe ? .trailing : .leading, spacing: 3) {
                    Text(message.displayText)
                        .font(.system(size: 14))
                        .foregroundStyle(message.isFromMe ? .white : .primary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 18)
                                .fill(message.isFromMe ? Color.blue : Color(nsColor: .controlBackgroundColor))
                        )
                    Text(Self.timeFormatter.string(from: message.date))
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 4)
                }
                if !message.isFromMe { Spacer(minLength: 64) }
            }
        }
        .padding(.bottom, 2)
    }
}
