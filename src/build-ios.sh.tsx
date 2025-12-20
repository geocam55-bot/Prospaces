#!/bin/bash

# ProSpaces CRM - iOS Build Script
# Automates the iOS app build process

set -e

echo "📱 ProSpaces CRM - iOS App Build Script"
echo "========================================"
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ Error: iOS development requires macOS"
    echo "Please run this script on a Mac computer."
    exit 1
fi

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Error: Xcode is not installed"
    echo "Please install Xcode from the Mac App Store"
    echo "https://apps.apple.com/app/xcode/id497799835"
    exit 1
fi

echo "✅ macOS detected"
echo "✅ Xcode installed"
echo ""

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    echo "⚠️  CocoaPods not found. Installing..."
    sudo gem install cocoapods
    echo "✅ CocoaPods installed"
else
    echo "✅ CocoaPods installed"
fi

echo ""

# Check if Capacitor is installed
echo "📦 Checking Capacitor installation..."
if ! grep -q "@capacitor/core" package.json; then
    echo "Installing Capacitor dependencies..."
    npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/push-notifications @capacitor/preferences @capacitor/app @capacitor/browser @capacitor/filesystem @capacitor/share --save
    echo "✅ Capacitor installed"
else
    echo "✅ Capacitor already installed"
fi

echo ""

# Build the web app
echo "🔨 Building web application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

echo "✅ Web app built successfully"
echo ""

# Check if iOS platform exists
if [ ! -d "ios" ]; then
    echo "📱 Adding iOS platform..."
    npx cap add ios
    echo "✅ iOS platform added"
else
    echo "✅ iOS platform exists"
fi

echo ""

# Sync to iOS
echo "🔄 Syncing to iOS..."
npx cap sync ios

if [ $? -ne 0 ]; then
    echo "❌ Sync failed. Trying to fix..."
    cd ios/App
    pod install
    cd ../..
    npx cap sync ios
fi

echo "✅ Sync complete"
echo ""

# Check for app icons
if [ ! -d "ios/App/App/Assets.xcassets/AppIcon.appiconset" ]; then
    echo "⚠️  Warning: App icons not found"
    echo "Please add app icons before building for App Store"
    echo "See: ios-app-icons/README.md"
else
    echo "✅ App icons folder found"
fi

echo ""
echo "========================================"
echo "✅ iOS app is ready!"
echo ""
echo "Next steps:"
echo "1. Opening Xcode..."
echo "2. Configure signing (select your Team)"
echo "3. Select a device or simulator"
echo "4. Click the Play button to run"
echo ""
echo "📚 Full guide: BUILD_IOS_APP.md"
echo "========================================"
echo ""

# Open in Xcode
echo "🚀 Opening Xcode..."
npx cap open ios

echo ""
echo "✅ Xcode launched!"
echo ""
echo "In Xcode:"
echo "1. Select 'App' in project navigator"
echo "2. Go to 'Signing & Capabilities'"
echo "3. Select your Team"
echo "4. Choose a device (simulator or real iPhone)"
echo "5. Click Play (▶️) to run"
echo ""
