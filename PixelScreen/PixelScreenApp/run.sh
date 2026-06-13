#!/bin/bash
set -e

swift build

APP=".build/PixelScreen.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp .build/arm64-apple-macosx/debug/PixelScreenApp "$APP/Contents/MacOS/"
cp Sources/Info.plist "$APP/Contents/"

open "$APP"
echo "PixelScreen started in menu bar."
