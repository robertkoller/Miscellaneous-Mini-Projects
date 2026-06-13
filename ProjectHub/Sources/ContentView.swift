import SwiftUI

struct ContentView: View {
    @StateObject private var manager = ProjectManager()
    @State private var selected: Project.ID?

    private let rootURL = URL(fileURLWithPath:
        "/Users/robertkoller/CodingProjects/MiscMiniProj")

    var body: some View {
        NavigationSplitView {
            List(manager.projects, selection: $selected) { project in
                Label {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(project.name).fontWeight(.medium)
                        Text(project.type.rawValue)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                } icon: {
                    if let iconImage = project.iconImage {
                        Image(nsImage: iconImage)
                            .resizable()
                            .interpolation(.high)
                            .frame(width: 28, height: 28)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    } else {
                        Text(project.type.icon)
                            .font(.title3)
                            .frame(width: 28, height: 28)
                    }
                }
            }
            .navigationTitle("Projects")
            .navigationSplitViewColumnWidth(min: 200, ideal: 220)
        } detail: {
            if let id = selected,
               let project = manager.projects.first(where: { $0.id == id }) {
                ProjectDetailView(project: project)
                        .id(project.id)
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "square.grid.2x2")
                        .font(.system(size: 48))
                        .foregroundStyle(.quaternary)
                    Text("Select a project")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .onAppear { manager.load(from: rootURL) }
    }
}
