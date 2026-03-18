#!/bin/bash
# Script to build and run Android app on macOS

echo "🤖 [BUILD] Starting Android build process..."

# Проверка node_modules
if [ ! -d "node_modules" ]; then
  echo "📦 [INSTALL] Installing dependencies..."
  npm install
fi

# Проверка Gradle wrapper
if [ ! -f "android/gradlew" ]; then
  echo "❌ [ERROR] Gradle wrapper not found"
  exit 1
fi

# Очистка старого билда (опционально)
read -p "🧹 Clean build? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🧹 [CLEAN] Cleaning Android build..."
  cd android
  ./gradlew clean
  cd ..
fi

# Сборка Debug APK
echo "🏗️  [BUILD] Building Debug APK..."
cd android
./gradlew assembleDebug

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ [SUCCESS] Build completed!"
  echo ""
  echo "📦 APK location:"
  echo "   $(pwd)/app/build/outputs/apk/debug/app-debug.apk"
  echo ""
  
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
  
  # Проверка наличия устройства
  cd ..
  
  echo "📱 [DEVICES] Checking for connected devices..."
  
  if command -v adb &> /dev/null; then
    DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
    
    if [ $DEVICES -gt 0 ]; then
      echo "✅ Found $DEVICES device(s)"
      echo ""
      read -p "📲 Install APK now? (Y/n): " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo "📲 [INSTALL] Installing APK..."
        adb install -r "android/$APK_PATH"
        
        if [ $? -eq 0 ]; then
          echo "✅ [INSTALLED] App installed successfully!"
          echo ""
          read -p "🚀 Launch app now? (Y/n): " -n 1 -r
          echo
          if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            adb shell am start -n com.suckfy/.MainActivity
            echo "✅ [LAUNCHED] App started!"
          fi
        fi
      fi
    else
      echo "⚠️  No devices found. Connect a device or start an emulator."
      echo ""
      echo "To install manually:"
      echo "  adb install -r android/$APK_PATH"
    fi
  else
    echo "⚠️  adb not found. Install Android SDK Platform-Tools"
    echo ""
    echo "APK built successfully at: android/$APK_PATH"
  fi
else
  echo "❌ [ERROR] Build failed!"
  cd ..
  exit 1
fi

echo ""
echo "🎉 Done!"
