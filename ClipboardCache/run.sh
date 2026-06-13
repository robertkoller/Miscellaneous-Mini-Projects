#!/bin/bash
set -e
swift build
APP=".build/ClipboardCache.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
mkdir -p "$APP/Contents/Resources"
cp .build/arm64-apple-macosx/debug/ClipboardCache "$APP/Contents/MacOS/"
cp Sources/Info.plist "$APP/Contents/"
cp Sources/AppIcon.icns "$APP/Contents/Resources/"
open "$APP"
echo "ClipboardCache started."
