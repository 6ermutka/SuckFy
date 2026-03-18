#!/bin/bash
# Android Dev Setup Script for macOS

echo "🤖 [ANDROID] Starting Android development setup..."

# Проверка Android SDK
if [ -z "$ANDROID_HOME" ]; then
  echo "⚠️  [WARNING] ANDROID_HOME not set"
  echo "Please set it in ~/.zshrc or ~/.bash_profile:"
  echo "export ANDROID_HOME=\$HOME/Library/Android/sdk"
  echo "export PATH=\$PATH:\$ANDROID_HOME/emulator"
  echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
else
  echo "✅ ANDROID_HOME: $ANDROID_HOME"
fi

# Проверка adb
if ! command -v adb &> /dev/null; then
  echo "❌ [ERROR] adb not found. Install Android SDK Platform-Tools"
  exit 1
fi

echo "✅ adb found: $(which adb)"

# Проверка устройств
echo ""
echo "📱 [DEVICES] Checking connected devices..."
adb devices -l

# Список эмуляторов
echo ""
echo "📱 [EMULATORS] Available emulators:"
if command -v emulator &> /dev/null; then
  emulator -list-avds
else
  echo "⚠️  emulator command not found"
  if [ -n "$ANDROID_HOME" ]; then
    $ANDROID_HOME/emulator/emulator -list-avds
  fi
fi

echo ""
echo "✅ [READY] Setup complete! Ready to build Android app"
