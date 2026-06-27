#!/bin/bash
set -e

swift build

APP=".build/PixelScreen.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp .build/arm64-apple-macosx/debug/PixelScreenApp "$APP/Contents/MacOS/"
cp Sources/Info.plist "$APP/Contents/"

# Ad-hoc sign so macOS TCC can track the permission by bundle path + identity.
# Without this, each rebuild produces a different binary and TCC denies access.
codesign --force --deep --sign - "$APP"

open "$APP"
echo "PixelScreen started in menu bar."
