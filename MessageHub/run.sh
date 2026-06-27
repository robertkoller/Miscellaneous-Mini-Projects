#!/bin/bash
set -e
swift build
APP=".build/MessageHub.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
mkdir -p "$APP/Contents/Resources"
cp .build/arm64-apple-macosx/debug/MessageHub "$APP/Contents/MacOS/"
cp Sources/Info.plist "$APP/Contents/"
cp Sources/AppIcon.icns "$APP/Contents/Resources/"
codesign --force --sign - "$APP"
open "$APP"
echo "MessageHub started."
