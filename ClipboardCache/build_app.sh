#!/bin/bash
set -e
swift build -c release
APP="ClipboardCache.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
mkdir -p "$APP/Contents/Resources"
cp .build/arm64-apple-macosx/release/ClipboardCache "$APP/Contents/MacOS/"
cp Sources/Info.plist "$APP/Contents/"
cp Sources/AppIcon.icns "$APP/Contents/Resources/"
echo "Built $APP — drag to /Applications or the Dock."
