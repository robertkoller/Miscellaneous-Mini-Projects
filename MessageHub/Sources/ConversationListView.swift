import SwiftUI

struct ConversationListView: View {
    @EnvironmentObject private var store: ConversationStore
    @State private var searchText = ""

    private static let avatarColors: [Color] = [
        .blue, .purple, .pink, .orange, .green, .teal, .indigo
    ]

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
                        store.selectedChatId == conversation.id
                            ? Color.accentColor.opacity(0.12)
                            : Color.clear
                    )
                    .contentShape(Rectangle())
                    .onTapGesture {
                        store.selectConversation(conversation.id)
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
        .navigationSplitViewColumnWidth(min: 240, ideal: 280, max: 360)
        .navigationTitle("Messages")
    }
}

struct ConversationRow: View {
    let conversation: Conversation

    private static let avatarColors: [Color] = [
        .blue, .purple, .pink, .orange, .green, .teal, .indigo
    ]

    private var avatarColor: Color {
        Self.avatarColors[conversation.avatarColorIndex]
    }

    var body: some View {
        HStack(spacing: 10) {
            avatarView
            contentView
        }
        .padding(.vertical, 3)
    }

    private var avatarView: some View {
        ZStack {
            Circle()
                .fill(avatarColor)
                .frame(width: 42, height: 42)
            Text(conversation.initials)
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(.white)
        }
    }

    private var contentView: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline) {
                Text(conversation.effectiveDisplayName)
                    .font(.system(
                        size: 13,
                        weight: conversation.dbUnreadCount > 0 && !conversation.isMuted ? .semibold : .regular
                    ))
                    .lineLimit(1)
                Spacer()
                if let lastMessage = conversation.lastMessage {
                    Text(lastMessage.date.relativeString)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
            }
            HStack(alignment: .center) {
                if let lastMessage = conversation.lastMessage {
                    Text(lastMessage.isFromMe ? "You: \(lastMessage.displayText)" : lastMessage.displayText)
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer()
                if conversation.isMuted {
                    Image(systemName: "bell.slash.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                } else if conversation.dbUnreadCount > 0 {
                    Text("\(conversation.dbUnreadCount)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue, in: Capsule())
                }
            }
        }
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
