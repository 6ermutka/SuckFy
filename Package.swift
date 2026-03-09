// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "SuckFy",
    platforms: [
        .macOS(.v14),
        .iOS(.v17)
    ],
    targets: [
        .executableTarget(
            name: "SuckFy",
            path: ".",
            exclude: ["Package.swift"],
            swiftSettings: [
                .unsafeFlags(["-parse-as-library"])
            ]
        )
    ]
)
