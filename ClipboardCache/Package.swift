// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ClipboardCache",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "ClipboardCache",
            path: "Sources",
            exclude: ["Info.plist", "AppIcon.icns", "AppIcon.iconset"]
        )
    ]
)
