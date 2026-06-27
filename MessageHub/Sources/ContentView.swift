import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var store: ConversationStore

    var body: some View {
        Group {
            if !store.isDatabaseAccessible {
                PermissionPromptView()
            } else {
                NavigationSplitView {
                    ConversationListView()
                } detail: {
                    if let chatId = store.selectedChatId,
                       let conversation = store.conversations.first(where: { $0.id == chatId }) {
                        MessageThreadView(conversation: conversation)
                        .id(conversation.id)
                    } else {
                        EmptyDetailView()
                    }
                }
            }
        }
        .frame(minWidth: 750, minHeight: 500)
    }
}

private struct EmptyDetailView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 52))
                .foregroundStyle(.quaternary)
            Text("Select a conversation")
                .font(.title3)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

private struct PermissionPromptView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "lock.shield")
                .font(.system(size: 52))
                .foregroundStyle(.orange)
            Text("Full Disk Access Required")
                .font(.title2)
                .fontWeight(.semibold)
            Text("MessageHub needs Full Disk Access to read your messages.\n\nSystem Settings → Privacy & Security → Full Disk Access → add MessageHub")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .frame(maxWidth: 360)
            Button("Open Privacy Settings") {
                if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles") {
                    NSWorkspace.shared.open(url)
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(32)
    }
}
