# 🚀 iOS Quick Start - ProSpaces CRM

Build your iPhone app in 10 minutes!

---

## ⚡ Super Quick Build (For Mac Users)

### Prerequisites Check

You need:
- ✅ **Mac computer** (required)
- ✅ **Xcode** (free from Mac App Store)
- ✅ **Apple ID** (free account works for testing)

---

## Option 1: Automated Script (Easiest)

```bash
# Make script executable
chmod +x build-ios.sh

# Run the script
./build-ios.sh
```

**That's it!** The script will:
1. ✅ Install all dependencies
2. ✅ Build your web app
3. ✅ Create iOS project
4. ✅ Open Xcode automatically

---

## Option 2: Manual Steps (5 commands)

```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios

# 2. Build web app
npm run build

# 3. Add iOS platform
npx cap add ios

# 4. Sync to iOS
npx cap sync ios

# 5. Open in Xcode
npx cap open ios
```

---

## In Xcode (First Time Setup)

### Step 1: Configure Signing
1. Click **App** in left sidebar
2. Select **Signing & Capabilities** tab
3. Under **Team**: Click dropdown and select your Apple ID
4. Bundle Identifier: Use `com.prospaces.crm` (or customize)

### Step 2: Select Device
1. At the top toolbar, click device selector
2. Choose:
   - **iPhone 15 Pro** (simulator - free)
   - **Your iPhone** (if connected via USB)

### Step 3: Run
1. Click the **Play** button (▶️) at top left
2. Wait 1-2 minutes for build
3. App launches in simulator or your iPhone!

---

## Testing on Your iPhone

### Connect iPhone
1. Plug iPhone into Mac via USB
2. Unlock iPhone
3. Trust the computer (popup on iPhone)

### First Run
1. In Xcode, select your iPhone from device list
2. Click Play (▶️)
3. Xcode may say "Untrusted Developer"
4. On iPhone: Go to **Settings** → **General** → **VPN & Device Management**
5. Tap your developer certificate
6. Tap **Trust**
7. Open app on iPhone

---

## Troubleshooting

### "Command CodeSign failed"
**Fix:** Select your Team in Signing & Capabilities

### "No profiles found"
**Fix:** Xcode → Preferences → Accounts → Add Apple ID

### "Build Failed"
```bash
cd ios/App
pod install
cd ../..
npx cap sync ios
```

### CocoaPods not found
```bash
sudo gem install cocoapods
```

---

## App Icons (Before App Store)

### Quick Icon Generator

1. Create 1024x1024 PNG icon
2. Go to: https://icon.kitchen
3. Upload your icon
4. Download iOS icons
5. Replace in: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

---

## Publishing to App Store

See **BUILD_IOS_APP.md** for complete App Store submission guide.

**Quick Steps:**
1. Join Apple Developer Program ($99/year)
2. Create app in App Store Connect
3. In Xcode: Product → Archive
4. Click "Distribute App"
5. Submit for review (1-3 days)

---

## Update Your App

When you make changes:

```bash
# Rebuild and sync
npm run build
npx cap sync ios
npx cap open ios

# Then in Xcode: Product → Build (or click Play)
```

---

## Environment: Development vs Production

### Development (Testing)
- Uses your local or Vercel web app
- Fast iteration
- No App Store submission needed

### Production (App Store)
- Edit `capacitor.config.ts`:
```typescript
server: {
  url: 'https://your-app.vercel.app',  // Your production URL
  cleartext: false
}
```

Or bundle everything:
```typescript
// Remove server config entirely
// App uses bundled web files from dist/
```

---

## Project Structure

```
your-project/
├── ios/                          # iOS native project (generated)
│   └── App/
│       └── App.xcworkspace      # Open this in Xcode
├── capacitor.config.ts          # Capacitor configuration ✅
├── build-ios.sh                 # Automated build script ✅
├── BUILD_IOS_APP.md            # Detailed guide ✅
└── IOS_QUICK_START.md          # This file ✅
```

---

## What's Included

✅ **Native iOS app wrapper**
✅ **Splash screen support**
✅ **Status bar styling**
✅ **Keyboard management**
✅ **File system access**
✅ **Share functionality**
✅ **Push notifications** (ready to configure)
✅ **App preferences storage**

---

## Next Steps

1. ✅ Run the build script or manual commands
2. ✅ Test app in simulator
3. ✅ Test on your iPhone
4. ✅ Add app icons
5. ✅ Customize branding
6. 📱 Submit to App Store (optional)

---

## Configuration

Your app is configured as:

```
App Name: ProSpaces CRM
Bundle ID: com.prospaces.crm
Supabase: Already configured ✅
Web Build: dist/ folder
```

---

## Resources

- **Detailed Guide**: `BUILD_IOS_APP.md`
- **Capacitor Docs**: https://capacitorjs.com/docs/ios
- **Xcode Help**: https://developer.apple.com/xcode/

---

## 🎯 Start Now!

**Ready to build?**

```bash
chmod +x build-ios.sh && ./build-ios.sh
```

**Or just:**

```bash
npm run build && npx cap add ios && npx cap open ios
```

🎉 **Your iPhone app will be running in minutes!**
