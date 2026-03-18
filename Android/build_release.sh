#!/bin/bash

echo "🚀 Building SuckFy Release APK v1.1..."

cd android

echo "📦 Cleaning previous build..."
./gradlew clean

echo "🔨 Building release APK..."
./gradlew assembleRelease

echo "✅ Build complete!"
echo ""
echo "📱 APK location:"
echo "android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "📊 APK info:"
ls -lh app/build/outputs/apk/release/app-release.apk 2>/dev/null || echo "APK not found - check for errors above"

cd ..
