import SwiftUI

// MARK: - Layout helpers

struct MessagePosition {
    let isFirstInGroup: Bool
    let isLastInGroup: Bool
    let showTimestamp: Bool
    let showSenderName: Bool
}

func computePositions(for messages: [Message], isGroupChat: Bool) -> [Int64: MessagePosition] {
    var result: [Int64: MessagePosition] = [:]
    let groupGapSeconds: Double = 120
    let timestampGapSeconds: Double = 300

    for (index, message) in messages.enumerated() {
        let previous = index > 0 ? messages[index - 1] : nil
        let next = index < messages.count - 1 ? messages[index + 1] : nil

        let isFirstInGroup: Bool
        let isLastInGroup: Bool
        if let previous {
            let sameSource = previous.isFromMe == message.isFromMe &&
                             previous.senderHandle == message.senderHandle
            let closeInTime = message.date.timeIntervalSince(previous.date) < groupGapSeconds
            isFirstInGroup = !(sameSource && closeInTime)
        } else {
            isFirstInGroup = true
        }

        if let next {
            let sameSource = next.isFromMe == message.isFromMe &&
                             next.senderHandle == message.senderHandle
            let closeInTime = next.date.timeIntervalSince(message.date) < groupGapSeconds
            isLastInGroup = !(sameSource && closeInTime)
        } else {
            isLastInGroup = true
        }

        let showTimestamp: Bool
        if let previous {
            showTimestamp = message.date.timeIntervalSince(previous.date) > timestampGapSeconds
        } else {
            showTimestamp = true
        }

        let showSenderName = isGroupChat && !message.isFromMe && isFirstInGroup

        result[message.id] = MessagePosition(
            isFirstInGroup: isFirstInGroup,
            isLastInGroup: isLastInGroup,
            showTimestamp: showTimestamp,
            showSenderName: showSenderName
        )
    }
    return result
}

// MARK: - Bubble shape

struct BubbleShape: Shape {
    let isFromMe: Bool
    let isFirst: Bool
    let isLast: Bool

    private let fullRadius: CGFloat = 18
    private let smallRadius: CGFloat = 4

    func path(in rect: CGRect) -> Path {
        let big = fullRadius
        let small = smallRadius

        let topLeft    = isFromMe ? big  : (isFirst ? big  : small)
        let topRight   = isFromMe ? (isFirst ? big  : small) : big
        let bottomLeft = isFromMe ? big  : (isLast  ? big  : small)
        let bottomRight = isFromMe ? (isLast  ? big  : small) : big

        let tl = min(topLeft,    rect.width / 2, rect.height / 2)
        let tr = min(topRight,   rect.width / 2, rect.height / 2)
        let bl = min(bottomLeft, rect.width / 2, rect.height / 2)
        let br = min(bottomRight, rect.width / 2, rect.height / 2)

        var path = Path()
        path.move(to: CGPoint(x: tl, y: 0))
        path.addLine(to: CGPoint(x: rect.maxX - tr, y: 0))
        path.addArc(center: CGPoint(x: rect.maxX - tr, y: tr), radius: tr,
                    startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - br))
        path.addArc(center: CGPoint(x: rect.maxX - br, y: rect.maxY - br), radius: br,
                    startAngle: .degrees(0), endAngle: .degrees(90), clockwise: false)
        path.addLine(to: CGPoint(x: bl, y: rect.maxY))
        path.addArc(center: CGPoint(x: bl, y: rect.maxY - bl), radius: bl,
                    startAngle: .degrees(90), endAngle: .degrees(180), clockwise: false)
        path.addLine(to: CGPoint(x: 0, y: tl))
        path.addArc(center: CGPoint(x: tl, y: tl), radius: tl,
                    startAngle: .degrees(180), endAngle: .degrees(270), clockwise: false)
        path.closeSubpath()
        return path
    }
}

// MARK: - Thread view

struct MessageThreadView: View {
    let conversation: Conversation
    @EnvironmentObject private var store: ConversationStore
    @State private var inputText = ""
    @State private var scrollAnchorId: Int64? = nil
    @State private var isLoadingMore = false
    @State private var isSending = false
    @State private var wallpaperImage: NSImage? = nil

    private var positions: [Int64: MessagePosition] {
        computePositions(for: store.messages, isGroupChat: conversation.isGroupChat)
    }

    var body: some View {
        VStack(spacing: 0) {
            threadHeader
            Divider()
                .opacity(0.5)
            messageList
            Divider()
                .opacity(0.5)
            inputBar
        }
        .background(Color(.windowBackgroundColor))
        .alert("Send Failed", isPresented: Binding(
            get: { store.sendError != nil },
            set: { if !$0 { store.sendError = nil } }
        )) {
            Button("OK") { store.sendError = nil }
        } message: {
            Text(store.sendError ?? "")
        }
    }

    // MARK: Header

    private var threadHeader: some View {
        HStack(spacing: 10) {
            AvatarView(conversation: conversation, size: 36)

            VStack(alignment: .leading, spacing: 1) {
                Text(conversation.effectiveDisplayName)
                    .font(.system(size: 13.5, weight: .semibold))
                if conversation.isGroupChat {
                    Text("\(conversation.participants.count) people")
                        .font(.system(size: 11.5))
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Button {
                store.forceRefresh(chatId: conversation.id)
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .help("Reload messages")

            Button {
                store.toggleMute(chatId: conversation.id)
            } label: {
                Image(systemName: conversation.isMuted ? "bell.slash.fill" : "bell.fill")
                    .font(.system(size: 13))
                    .foregroundStyle(conversation.isMuted ? .secondary : .primary)
            }
            .buttonStyle(.plain)
            .help(conversation.isMuted ? "Unmute" : "Mute")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color(.windowBackgroundColor))
    }

    // MARK: Message list

    private var messageList: some View {
        ScrollViewReader { proxy in
            ZStack {
                // Wallpaper background — loaded async when view appears.
                if let wallpaperImage {
                    Image(nsImage: wallpaperImage)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .clipped()
                        .allowsHitTesting(false)
                }

                ScrollView {
                    LazyVStack(spacing: 0) {
                        if store.hasMoreMessages {
                            loadMoreTrigger(proxy: proxy)
                        }
                        ForEach(store.messages) { message in
                            let position = positions[message.id] ?? MessagePosition(
                                isFirstInGroup: true, isLastInGroup: true,
                                showTimestamp: false, showSenderName: false
                            )
                            MessageRow(
                                message: message,
                                position: position,
                                conversation: conversation
                            )
                            .id(message.id)
                            .transition(.opacity.combined(with: .move(edge: .bottom)))
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
            .onAppear {
                scrollToBottom(proxy: proxy, animated: false)
                loadWallpaper()
            }
            .onChange(of: store.conversationLoadToken) { _ in
                // Fired after a fresh conversation is loaded — always go to bottom.
                DispatchQueue.main.async {
                    scrollToBottom(proxy: proxy, animated: false)
                }
            }
            .onChange(of: store.messages.count) { _ in
                if let anchorId = scrollAnchorId {
                    DispatchQueue.main.async {
                        proxy.scrollTo(anchorId, anchor: .top)
                        scrollAnchorId = nil
                    }
                } else if store.conversationLoadToken > 0 {
                    // New message arrived — follow to bottom.
                    scrollToBottom(proxy: proxy, animated: true)
                }
            }
        }
    }

    @ViewBuilder
    private func loadMoreTrigger(proxy: ScrollViewProxy) -> some View {
        HStack {
            Spacer()
            if isLoadingMore {
                ProgressView()
                    .scaleEffect(0.75)
                    .transition(.opacity)
            }
            Spacer()
        }
        .frame(height: 36)
        .onAppear {
            guard !isLoadingMore, store.hasMoreMessages else { return }
            isLoadingMore = true
            scrollAnchorId = store.messages.first?.id
            withAnimation { isLoadingMore = true }
            store.loadMoreMessages()
            withAnimation { isLoadingMore = false }
        }
    }

    // MARK: Input bar

    private var inputBar: some View {
        HStack(alignment: .bottom, spacing: 8) {
            TextField("iMessage", text: $inputText, axis: .vertical)
                .textFieldStyle(.plain)
                .lineLimit(1...8)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(Color(.separatorColor), lineWidth: 1)
                )
                .onSubmit {
                    sendIfNotEmpty()
                }

            Button {
                sendIfNotEmpty()
            } label: {
                ZStack {
                    Circle()
                        .fill(canSend ? Color.blue : Color(.tertiaryLabelColor))
                        .frame(width: 30, height: 30)
                    Image(systemName: "arrow.up")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
            .buttonStyle(.plain)
            .disabled(!canSend)
            .scaleEffect(isSending ? 0.85 : 1.0)
            .animation(.spring(response: 0.2, dampingFraction: 0.5), value: isSending)
            .padding(.bottom, 1)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Color(.windowBackgroundColor))
    }

    private var canSend: Bool {
        !inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func sendIfNotEmpty() {
        let trimmed = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        isSending = true
        store.sendMessage(trimmed)
        inputText = ""
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            isSending = false
        }
    }

    private func loadWallpaper() {
        guard wallpaperImage == nil, let path = conversation.wallpaperPath else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            let loaded = NSImage(contentsOfFile: path)
            DispatchQueue.main.async { wallpaperImage = loaded }
        }
    }

    private func scrollToBottom(proxy: ScrollViewProxy, animated: Bool) {
        guard let lastId = store.messages.last?.id else { return }
        if animated {
            withAnimation(.easeOut(duration: 0.2)) {
                proxy.scrollTo(lastId, anchor: .bottom)
            }
        } else {
            proxy.scrollTo(lastId, anchor: .bottom)
        }
    }
}

// MARK: - Message row

struct MessageRow: View {
    let message: Message
    let position: MessagePosition
    let conversation: Conversation
    @EnvironmentObject private var store: ConversationStore

    private var senderDisplayName: String {
        guard let handle = message.senderHandle else { return "" }
        return store.resolvedContactNames[handle] ?? handle
    }

    var body: some View {
        VStack(spacing: 0) {
            if position.showTimestamp {
                TimestampLabel(date: message.date)
                    .padding(.top, 16)
                    .padding(.bottom, 4)
            }

            if position.showSenderName {
                Text(senderDisplayName)
                    .font(.system(size: 11.5))
                    .foregroundStyle(.secondary)
                    .padding(.leading, 52)
                    .padding(.bottom, 2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            HStack(alignment: .bottom, spacing: 6) {
                if message.isFromMe {
                    Spacer(minLength: 60)
                    MessageBubbleView(message: message, position: position)
                } else {
                    senderAvatar
                    MessageBubbleView(message: message, position: position)
                    Spacer(minLength: 60)
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, position.isFirstInGroup && !position.showTimestamp ? 2 : 1)
            .padding(.bottom, position.isLastInGroup ? 6 : 1)
        }
        .animation(.easeOut(duration: 0.18), value: message.id)
    }

    @ViewBuilder
    private var senderAvatar: some View {
        if position.isLastInGroup {
            senderAvatarImage
                .frame(width: 28, height: 28)
        } else {
            Color.clear.frame(width: 28, height: 28)
        }
    }

    @ViewBuilder
    private var senderAvatarImage: some View {
        let handle = message.senderHandle ?? ""
        if let photo = store.resolvedContactPhotos[handle] {
            Image(nsImage: photo)
                .resizable()
                .scaledToFill()
                .frame(width: 28, height: 28)
                .clipShape(Circle())
        } else if !conversation.isGroupChat, let image = conversation.contactImage {
            Image(nsImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: 28, height: 28)
                .clipShape(Circle())
        } else {
            initialsCircle(for: handle, diameter: 28)
        }
    }

    private func initialsCircle(for handle: String, diameter: CGFloat) -> some View {
        let colorIndex = Int(abs(handle.hashValue)) % AvatarView.colors.count
        let displayName = store.resolvedContactNames[handle] ?? handle
        let initial = String((displayName.first ?? "?").uppercased())
        return ZStack {
            Circle().fill(AvatarView.colors[colorIndex])
            Text(initial)
                .font(.system(size: diameter * 0.4, weight: .semibold))
                .foregroundStyle(.white)
        }
        .frame(width: diameter, height: diameter)
    }
}

// MARK: - Bubble content

struct MessageBubbleView: View {
    let message: Message
    let position: MessagePosition

    var body: some View {
        VStack(alignment: message.isFromMe ? .trailing : .leading, spacing: 2) {
            bubbleContent
            if position.isLastInGroup && message.isFromMe {
                deliveryLabel
            }
        }
    }

    @ViewBuilder
    private var bubbleContent: some View {
        if !message.imageAttachmentPaths.isEmpty {
            imageAttachmentBubble
        } else if let text = message.text, !text.isEmpty {
            textBubble(text: text)
        } else if message.hasAttachments {
            textBubble(text: "📎 Attachment")
        }
    }

    private func textBubble(text: String) -> some View {
        let bubbleColor: Color = message.isFromMe
            ? Color.blue
            : Color(.init(name: nil, dynamicProvider: { appearance in
                appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
                    ? NSColor(red: 0.23, green: 0.23, blue: 0.25, alpha: 1)
                    : NSColor(red: 0.90, green: 0.90, blue: 0.92, alpha: 1)
            }))

        return Text(text)
            .font(.system(size: 14))
            .foregroundStyle(message.isFromMe ? .white : Color(.labelColor))
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                BubbleShape(isFromMe: message.isFromMe,
                            isFirst: position.isFirstInGroup,
                            isLast: position.isLastInGroup)
                    .fill(bubbleColor)
            )
    }

    private var imageAttachmentBubble: some View {
        VStack(spacing: 2) {
            ForEach(message.imageAttachmentPaths, id: \.self) { path in
                AttachmentImageView(path: path)
                    .clipShape(BubbleShape(isFromMe: message.isFromMe,
                                          isFirst: position.isFirstInGroup,
                                          isLast: position.isLastInGroup))
            }
        }
    }

    private var deliveryLabel: some View {
        Text(message.isRead ? "Read" : "Delivered")
            .font(.system(size: 10.5))
            .foregroundStyle(.secondary)
            .padding(.trailing, 4)
    }
}

// MARK: - Attachment image

struct AttachmentImageView: View {
    let path: String
    @State private var image: NSImage? = nil

    var body: some View {
        Group {
            if let image {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 240, maxHeight: 240)
            } else {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.separatorColor).opacity(0.2))
                    .frame(width: 200, height: 150)
                    .overlay(ProgressView().scaleEffect(0.8))
            }
        }
        .onAppear {
            guard image == nil else { return }
            DispatchQueue.global(qos: .userInitiated).async {
                let loaded = NSImage(contentsOfFile: path)
                DispatchQueue.main.async { image = loaded }
            }
        }
    }
}

// MARK: - Timestamp

struct TimestampLabel: View {
    let date: Date

    private static let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.doesRelativeDateFormatting = true
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter
    }()

    var body: some View {
        Text(Self.formatter.string(from: date))
            .font(.system(size: 11.5, weight: .medium))
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity)
    }
}
