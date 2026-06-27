// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MessageHub",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "MessageHub",
            dependencies: ["MessageHubObjC"],
            path: "Sources",
            exclude: ["Info.plist", "AppIcon.icns"],
            linkerSettings: [
                .linkedLibrary("sqlite3")
            ]
        ),
        .target(
            name: "MessageHubObjC",
            path: "ObjCSources",
            publicHeadersPath: "include"
        )
    ]
)
