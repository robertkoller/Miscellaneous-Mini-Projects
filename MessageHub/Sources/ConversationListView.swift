import SwiftUI

struct ConversationListView: View {
    @EnvironmentObject private var store: ConversationStore
    @State private var searchText = ""

    private var filteredConversations: [Conversation] {
        guard !searchText.isEmpty else { return store.conversations }
        return store.conversations.filter { conversation in
            conversation.effectiveDisplayName.localizedCaseInsensitiveContains(searchText) ||
            conversation.lastMessage?.displayText.localizedCaseInsensitiveContains(searchText) == true
        }
    }

    var body: some View {
        List {
            ForEach(filteredConversations) { conversation in
                ConversationRow(conversation: conversation)
                    .listRowBackground(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(store.selectedChatId == conversation.id
                                ? Color.accentColor.opacity(0.15)
                                : Color.clear)
                            .padding(.horizontal, 4)
                    )
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: 1, leading: 8, bottom: 1, trailing: 8))
                    .contentShape(Rectangle())
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.18)) {
                            store.selectConversation(conversation.id)
                        }
                    }
                    .contextMenu {
                        Button("Reload Messages") {
                            store.forceRefresh(chatId: conversation.id)
                        }
                        Divider()
                        Button(conversation.isMuted ? "Unmute Conversation" : "Mute Conversation") {
                            store.toggleMute(chatId: conversation.id)
                        }
                    }
            }
        }
        .listStyle(.sidebar)
        .searchable(text: $searchText, placement: .sidebar, prompt: "Search")
        .navigationSplitViewColumnWidth(min: 240, ideal: 290, max: 360)
        .navigationTitle("Messages")
    }
}

struct ConversationRow: View {
    let conversation: Conversation

    var body: some View {
        HStack(spacing: 11) {
            AvatarView(
                conversation: conversation,
                size: 46
            )

            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(conversation.effectiveDisplayName)
                        .font(.system(size: 13.5, weight: conversation.dbUnreadCount > 0 && !conversation.isMuted ? .semibold : .regular))
                        .lineLimit(1)
                    Spacer()
                    if let lastMessage = conversation.lastMessage {
                        Text(lastMessage.date.relativeString)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }
                }

                HStack(alignment: .center, spacing: 4) {
                    Group {
                        if let lastMessage = conversation.lastMessage {
                            let preview = lastMessage.isFromMe
                                ? "You: \(lastMessage.previewText)"
                                : lastMessage.previewText
                            Text(preview)
                                .font(.system(size: 12.5))
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }
                    Spacer(minLength: 0)
                    if conversation.isMuted {
                        Image(systemName: "bell.slash.fill")
                            .font(.system(size: 11))
                            .foregroundStyle(Color(.tertiaryLabelColor))
                    } else if conversation.dbUnreadCount > 0 {
                        Text("\(conversation.dbUnreadCount)")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 2)
                            .background(Color.blue, in: Capsule())
                            .fixedSize()
                    }
                }
            }
        }
        .padding(.vertical, 5)
        .padding(.horizontal, 6)
    }
}

struct AvatarView: View {
    let conversation: Conversation
    let size: CGFloat
    @EnvironmentObject private var store: ConversationStore

    static let colors: [Color] = [
        Color(red: 0.0,  green: 0.48, blue: 1.0),
        Color(red: 0.55, green: 0.25, blue: 0.95),
        Color(red: 1.0,  green: 0.18, blue: 0.33),
        Color(red: 1.0,  green: 0.58, blue: 0.0),
        Color(red: 0.2,  green: 0.78, blue: 0.35),
        Color(red: 0.0,  green: 0.73, blue: 0.83),
        Color(red: 0.35, green: 0.34, blue: 0.84)
    ]

    private var avatarColor: Color {
        Self.colors[conversation.avatarColorIndex]
    }

    var body: some View {
        ZStack {
            // contactImage holds the custom group photo (if any) or 1:1 contact photo.
            if let image = conversation.contactImage ?? store.resolvedContactPhotos[conversation.participants.first ?? ""] {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFill()
                    .frame(width: size, height: size)
                    .clipShape(Circle())
            } else if conversation.isGroupChat {
                groupAvatar
            } else {
                Circle()
                    .fill(avatarColor)
                    .frame(width: size, height: size)
                    .overlay(
                        Text(conversation.initials)
                            .font(.system(size: size * 0.36, weight: .semibold))
                            .foregroundStyle(.white)
                    )
            }
        }
        .frame(width: size, height: size)
    }

    private var groupAvatar: some View {
        let participants = Array(conversation.participants.prefix(2))
        let smallSize = size * 0.65
        let shift = size * 0.2

        return ZStack {
            Color(.windowBackgroundColor)
                .clipShape(Circle())
                .frame(width: size, height: size)

            if participants.count >= 2 {
                participantCircle(handle: participants[1], diameter: smallSize)
                    .offset(x: -shift * 0.8, y: shift * 0.8)
            }

            participantCircle(handle: participants.first ?? "", diameter: smallSize)
                .offset(x: shift * 0.8, y: -shift * 0.8)
        }
        .clipShape(Circle())
        .frame(width: size, height: size)
    }

    @ViewBuilder
    private func participantCircle(handle: String, diameter: CGFloat) -> some View {
        let colorIndex = Int(abs(handle.hashValue)) % Self.colors.count
        let initial: String = {
            let name = store.resolvedContactNames[handle] ?? handle
            return String((name.first ?? "?").uppercased())
        }()

        ZStack {
            if let photo = store.resolvedContactPhotos[handle] {
                Image(nsImage: photo)
                    .resizable()
                    .scaledToFill()
                    .frame(width: diameter, height: diameter)
                    .clipShape(Circle())
            } else {
                Circle()
                    .fill(Self.colors[colorIndex])
                    .frame(width: diameter, height: diameter)
                    .overlay(
                        Text(initial)
                            .font(.system(size: diameter * 0.38, weight: .semibold))
                            .foregroundStyle(.white)
                    )
            }
        }
        .overlay(Circle().stroke(Color(.windowBackgroundColor), lineWidth: 2))
    }
}

extension Message {
    var previewText: String {
        if let text = text, !text.isEmpty { return text }
        if hasAttachments { return "Photo" }
        return "Message"
    }
}

extension Date {
    var relativeString: String {
        let calendar = Calendar.current
        if calendar.isDateInToday(self) {
            let formatter = DateFormatter()
            formatter.dateFormat = "h:mm a"
            return formatter.string(from: self)
        }
        if calendar.isDateInYesterday(self) {
            return "Yesterday"
        }
        let components = calendar.dateComponents([.day], from: self, to: Date())
        if let days = components.day, days < 7 {
            let formatter = DateFormatter()
            formatter.dateFormat = "EEE"
            return formatter.string(from: self)
        }
        let formatter = DateFormatter()
        formatter.dateFormat = "M/d/yy"
        return formatter.string(from: self)
    }
}
