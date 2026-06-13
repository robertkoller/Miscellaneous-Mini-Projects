import Foundation
import AppKit

// MARK: - Model

enum ProjectType: String, CaseIterable {
    case python     = "Python"
    case typescript = "TypeScript / Node"
    case java       = "Java"
    case web        = "HTML / CSS / JS"
    case swift      = "Swift"
    case shell      = "Shell"
    case other      = "Other"

    var icon: String {
        switch self {
        case .python:     return "🐍"
        case .typescript: return "🟦"
        case .java:       return "☕"
        case .web:        return "🌐"
        case .swift:      return "🦅"
        case .shell:      return "⚙️"
        case .other:      return "📁"
        }
    }
}

struct RunAction: Identifiable {
    let id = UUID()
    let label: String
    let command: String   // run in /bin/zsh inside rootURL
}

struct Project: Identifiable {
    let id = UUID()
    let name: String
    let rootURL: URL
    let type: ProjectType
    let description: String
    let actions: [RunAction]
    var iconImage: NSImage? = nil
}

// MARK: - Manager

@MainActor
final class ProjectManager: ObservableObject {
    @Published var projects: [Project] = []

    func load(from rootURL: URL) {
        let fm = FileManager.default
        guard let entries = try? fm.contentsOfDirectory(
            at: rootURL,
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        ) else { return }

        let dirs = entries
            .filter { (try? $0.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true }
            .sorted { $0.lastPathComponent < $1.lastPathComponent }

        projects = dirs.compactMap { detect($0) }
    }

    // MARK: - Detection

    private func detect(_ url: URL) -> Project? {
        let name = url.lastPathComponent
        guard name != "ProjectHub" else { return nil }    // skip self

        let fm = FileManager.default
        func has(_ file: String) -> Bool {
            fm.fileExists(atPath: url.appendingPathComponent(file).path)
        }
        func hasExt(_ ext: String) -> Bool {
            (try? fm.contentsOfDirectory(atPath: url.path))?
                .contains { $0.hasSuffix(".\(ext)") } ?? false
        }
        func hasExtRecursive(_ ext: String, depth: Int = 1) -> Bool {
            guard let contents = try? fm.contentsOfDirectory(atPath: url.path) else { return false }
            for item in contents {
                if item.hasSuffix(".\(ext)") { return true }
                if depth > 0 {
                    let sub = url.appendingPathComponent(item)
                    var isDir = ObjCBool(false)
                    fm.fileExists(atPath: sub.path, isDirectory: &isDir)
                    if isDir.boolValue, hasExtRecursive2(ext, in: sub, depth: depth - 1) { return true }
                }
            }
            return false
        }

        let skipDirs = Set(["node_modules", ".git", ".build", "__pycache__", "venv", "dist"])
        func hasPackageJsonInSubdir() -> Bool {
            guard let items = try? fm.contentsOfDirectory(atPath: url.path) else { return false }
            return items.contains { item in
                !skipDirs.contains(item) &&
                fm.fileExists(atPath: url.appendingPathComponent(item)
                    .appendingPathComponent("package.json").path)
            }
        }

        var project: Project?
        if has("Package.swift") || hasExtRecursive("swift") {
            project = swiftProject(name: name, url: url)
        } else if has("requirements.txt") || hasExt("py") {
            project = pythonProject(name: name, url: url)
        } else if has("package.json") || hasExt("ts") {
            project = tsProject(name: name, url: url)
        } else if hasPackageJsonInSubdir() {
            project = tsProject(name: name, url: url)
        } else if has("index.html") || hasExt("html") {
            project = webProject(name: name, url: url)
        } else if hasExtRecursive("java") {
            project = javaProject(name: name, url: url)
        } else if hasExt("sh") {
            project = shellProject(name: name, url: url)
        } else {
            project = Project(name: name, rootURL: url, type: .other,
                              description: "Open in Finder to explore.", actions: [])
        }

        if var foundProject = project {
            foundProject.iconImage = detectProjectIcon(in: url)
            return foundProject
        }
        return nil
    }

    private func detectProjectIcon(in url: URL) -> NSImage? {
        let candidates = [
            url.appendingPathComponent("Sources/AppIcon.icns"),
            url.appendingPathComponent("AppIcon.icns"),
        ]
        for candidate in candidates {
            guard FileManager.default.fileExists(atPath: candidate.path) else { continue }
            if let image = NSImage(contentsOf: candidate) {
                return image
            }
        }
        return nil
    }

    // Recursive helper without the outer wrapper to avoid mutual recursion issues.
    private func hasExtRecursive2(_ ext: String, in url: URL, depth: Int) -> Bool {
        guard let contents = try? FileManager.default.contentsOfDirectory(atPath: url.path) else { return false }
        for item in contents {
            if item.hasSuffix(".\(ext)") { return true }
            if depth > 0 {
                let sub = url.appendingPathComponent(item)
                var isDir = ObjCBool(false)
                FileManager.default.fileExists(atPath: sub.path, isDirectory: &isDir)
                if isDir.boolValue, hasExtRecursive2(ext, in: sub, depth: depth - 1) { return true }
            }
        }
        return false
    }

    // MARK: - Per-type constructors

    private func pythonProject(name: String, url: URL) -> Project {
        let fm = FileManager.default
        let hasReqs = fm.fileExists(atPath: url.appendingPathComponent("requirements.txt").path)
        let hasVenv = fm.fileExists(atPath: url.appendingPathComponent("venv/bin/python3").path)
        let pip    = hasVenv ? "venv/bin/pip3"    : "pip3"
        let python = hasVenv ? "venv/bin/python3" : "python3"

        let pyFiles = ((try? fm.contentsOfDirectory(atPath: url.path)) ?? [])
            .filter { $0.hasSuffix(".py") }.sorted()

        var actions: [RunAction] = []
        if hasReqs {
            actions.append(RunAction(label: "Install deps",
                                     command: "\(pip) install -r requirements.txt"))
        }
        for f in pyFiles {
            actions.append(RunAction(label: "Run \(f)", command: "\(python) \(f)"))
        }
        if pyFiles.isEmpty {
            actions.append(RunAction(label: "Run main.py", command: "\(python) main.py"))
        }

        // Detect nested web apps (e.g. a React/Vite frontend in a subdirectory).
        let skipDirs = Set(["node_modules", "__pycache__", "dist", ".git", "venv"])
        if let subdirs = try? fm.contentsOfDirectory(atPath: url.path) {
            for subdir in subdirs.sorted() {
                guard !skipDirs.contains(subdir) else { continue }
                let subURL = url.appendingPathComponent(subdir)
                var isDir = ObjCBool(false)
                fm.fileExists(atPath: subURL.path, isDirectory: &isDir)
                guard isDir.boolValue else { continue }
                guard fm.fileExists(atPath: subURL.appendingPathComponent("package.json").path) else { continue }
                let scripts = packageJsonScripts(at: subURL)
                actions.append(RunAction(label: "\(subdir): npm install",
                                         command: "cd \(subdir) && npm install"))
                if let s = viteDevScript(in: scripts) {
                    actions.append(RunAction(label: "\(subdir): npm run \(s)",
                                             command: "cd \(subdir) && npm run \(s)"))
                } else if scripts["start"] != nil {
                    actions.append(RunAction(label: "\(subdir): npm start",
                                             command: "cd \(subdir) && npm start"))
                }
            }
        }

        return Project(name: name, rootURL: url, type: .python,
                       description: "Python project", actions: actions)
    }

    private func tsProject(name: String, url: URL) -> Project {
        let fm = FileManager.default
        let scripts    = packageJsonScripts(at: url)
        let viteScript = viteDevScript(in: scripts)

        var actions: [RunAction] = []

        if !scripts.isEmpty {
            actions.append(RunAction(label: "npm install", command: "npm install"))
            if let script = viteScript {
                actions.append(RunAction(label: "npm run \(script)", command: "npm run \(script)"))
            }
            if scripts["dev"] != nil, viteScript != "dev" {
                actions.append(RunAction(label: "npm run dev", command: "npm run dev"))
            }
            if scripts["start"] != nil, viteScript == nil {
                actions.append(RunAction(label: "npm start", command: "npm start"))
            }
        } else {
            // No root package.json — scan subdirectories for npm projects and static HTML.
            let skipDirs = Set(["node_modules", ".git", ".build", "__pycache__", "venv", "dist"])
            if let subdirs = try? fm.contentsOfDirectory(atPath: url.path) {
                for subdir in subdirs.sorted() {
                    guard !skipDirs.contains(subdir) else { continue }
                    let subdirURL = url.appendingPathComponent(subdir)
                    var isDirectory = ObjCBool(false)
                    fm.fileExists(atPath: subdirURL.path, isDirectory: &isDirectory)
                    guard isDirectory.boolValue else { continue }

                    if fm.fileExists(atPath: subdirURL.appendingPathComponent("package.json").path) {
                        let subdirScripts = packageJsonScripts(at: subdirURL)
                        actions.append(RunAction(label: "\(subdir): npm install",
                                                 command: "cd \(subdir) && npm install"))
                        if let script = viteDevScript(in: subdirScripts) {
                            actions.append(RunAction(label: "\(subdir): npm run \(script)",
                                                     command: "cd \(subdir) && npm run \(script)"))
                        } else if subdirScripts["dev"] != nil {
                            actions.append(RunAction(label: "\(subdir): npm run dev",
                                                     command: "cd \(subdir) && npm run dev"))
                        } else if subdirScripts["start"] != nil {
                            actions.append(RunAction(label: "\(subdir): npm start",
                                                     command: "cd \(subdir) && npm start"))
                        }
                    } else if fm.fileExists(atPath: subdirURL.appendingPathComponent("index.html").path) {
                        actions.append(RunAction(label: "Open \(subdir) in browser",
                                                 command: "open \(subdir)/index.html"))
                    }
                }
            }
        }

        return Project(name: name, rootURL: url, type: .typescript,
                       description: "TypeScript / Node project", actions: actions)
    }

    private func webProject(name: String, url: URL) -> Project {
        let actions = [RunAction(label: "Open in browser",
                                 command: "open index.html")]
        return Project(name: name, rootURL: url, type: .web,
                       description: "Static web project", actions: actions)
    }

    private func javaProject(name: String, url: URL) -> Project {
        let fm = FileManager.default
        var actions: [RunAction] = [
            RunAction(label: "Compile", command: "find . -name '*.java' | xargs javac"),
            RunAction(label: "Run Main", command: "java Main"),
        ]
        let skipDirs = Set(["node_modules", ".git", ".build"])
        if let subdirs = try? fm.contentsOfDirectory(atPath: url.path) {
            for subdir in subdirs.sorted() {
                guard !skipDirs.contains(subdir) else { continue }
                let subdirURL = url.appendingPathComponent(subdir)
                var isDirectory = ObjCBool(false)
                fm.fileExists(atPath: subdirURL.path, isDirectory: &isDirectory)
                guard isDirectory.boolValue else { continue }
                if fm.fileExists(atPath: subdirURL.appendingPathComponent("index.html").path) {
                    actions.append(RunAction(label: "Open \(subdir) in browser",
                                             command: "open \(subdir)/index.html"))
                }
            }
        }
        return Project(name: name, rootURL: url, type: .java,
                       description: "Java project", actions: actions)
    }

    private func swiftProject(name: String, url: URL) -> Project {
        // Package.swift may be in a subdirectory (e.g. PixelScreen/PixelScreenApp/).
        let packageDir = findPackageSwift(in: url) ?? url
        let prefix: String
        if packageDir.path == url.path {
            prefix = ""
        } else {
            let rel = packageDir.lastPathComponent
            prefix = "cd \(rel) && "
        }
        let hasRunScript = FileManager.default.fileExists(
            atPath: packageDir.appendingPathComponent("run.sh").path)
        let runAction = hasRunScript
            ? RunAction(label: "run.sh", command: "\(prefix)bash run.sh")
            : RunAction(label: "swift run", command: "\(prefix)swift run")
        let actions = [
            RunAction(label: "swift build", command: "\(prefix)swift build"),
            runAction,
        ]
        return Project(name: name, rootURL: url, type: .swift,
                       description: "Swift package", actions: actions)
    }

    private func findPackageSwift(in url: URL) -> URL? {
        if FileManager.default.fileExists(
            atPath: url.appendingPathComponent("Package.swift").path) {
            return url
        }
        guard let items = try? FileManager.default.contentsOfDirectory(atPath: url.path) else {
            return nil
        }
        for item in items {
            let sub = url.appendingPathComponent(item)
            var isDir = ObjCBool(false)
            FileManager.default.fileExists(atPath: sub.path, isDirectory: &isDir)
            if isDir.boolValue &&
               FileManager.default.fileExists(
                atPath: sub.appendingPathComponent("Package.swift").path) {
                return sub
            }
        }
        return nil
    }

    // MARK: - package.json helpers

    private func packageJsonScripts(at url: URL) -> [String: String] {
        guard let data = try? Data(contentsOf: url.appendingPathComponent("package.json")),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let scripts = json["scripts"] as? [String: String] else { return [:] }
        return scripts
    }

    // Returns the script name that runs the Vite dev server (not a build/preview).
    private func viteDevScript(in scripts: [String: String]) -> String? {
        if let dev = scripts["dev"], dev.trimmingCharacters(in: .whitespaces).hasPrefix("vite") {
            return "dev"
        }
        let skip = Set(["build", "preview"])
        return scripts
            .filter { key, value in
                !skip.contains(key) &&
                value.trimmingCharacters(in: .whitespaces).hasPrefix("vite")
            }
            .sorted { $0.key < $1.key }
            .first?.key
    }

    private func shellProject(name: String, url: URL) -> Project {
        let script = (try? FileManager.default.contentsOfDirectory(atPath: url.path))?
            .first { $0.hasSuffix(".sh") } ?? "run.sh"
        let actions = [RunAction(label: "Run \(script)", command: "bash \(script)")]
        return Project(name: name, rootURL: url, type: .shell,
                       description: "Shell script project", actions: actions)
    }
}
