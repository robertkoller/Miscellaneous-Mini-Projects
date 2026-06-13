#!/bin/bash
set -e

swift build -c release

APP="ProjectHub.app"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
mkdir -p "$APP/Contents/Resources"

cp .build/arm64-apple-macosx/release/ProjectHub "$APP/Contents/MacOS/"
cp Sources/Info.plist "$APP/Contents/"
cp Sources/AppIcon.icns "$APP/Contents/Resources/"

echo "Built $APP — drag it to /Applications or the Dock."
