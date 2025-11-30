# 📱 Build ProSpaces CRM for iPhone/iOS

Complete guide to building and deploying ProSpaces CRM as a native iOS app.

---

## Prerequisites

### Required Software

- ✅ **macOS** (Required for iOS development)
- ✅ **Xcode** (Download from Mac App Store - free)
- ✅ **Node.js** (Already installed)
- ✅ **CocoaPods** (Install with: `sudo gem install cocoapods`)

### Required Accounts

- ✅ **Apple Developer Account** ($99/year for App Store distribution)
  - Sign up at: https://developer.apple.com/programs/
  - Free account works for testing on personal devices

---

## Step 1: Install Capacitor Dependencies

Run these commands in your project directory:

```bash
# Install Capacitor and iOS platform
npm install @capacitor/core @capacitor/cli @capacitor/ios

# Install additional Capacitor plugins
npm install @capacitor/splash-screen @capacitor/status-bar @capacitor/keyboard @capacitor/push-notifications @capacitor/preferences @capacitor/app @capacitor/browser @capacitor/filesystem @capacitor/share
```

Or use the quick install script:

```bash
# Copy scripts from package.json.mobile to your package.json
# Then run:
npm run ios:install
```

---

## Step 2: Initialize iOS Platform

```bash
# Build your web app
npm run build

# Add iOS platform (creates ios folder)
npx cap add ios
```

This creates an `ios` folder with your Xcode project.

---

## Step 3: Configure App Icons

### Option A: Use Icon Generator (Easiest)

1. Create a 1024x1024 PNG icon for ProSpaces CRM
2. Go to https://icon.kitchen or https://appicon.co
3. Upload your icon
4. Download the generated icon set
5. Replace icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### Option B: Manual Setup

See `ios-app-icons/README.md` for required icon sizes.

---

## Step 4: Configure Splash Screen

Create a splash screen image (2732x2732 PNG recommended):

```bash
# Install splash screen generator
npm install -g cordova-res

# Generate splash screens
cordova-res ios --skip-config --copy
```

Or manually add splash screen in Xcode:
1. Open `ios/App/App/Assets.xcassets`
2. Add splash screen images to `Splash.imageset`

---

## Step 5: Update App Configuration

Edit `capacitor.config.ts` (already created ✅):

```typescript
{
  appId: 'com.prospaces.crm',  // Change to your bundle ID
  appName: 'ProSpaces CRM',
  webDir: 'dist',
}
```

**Important:** Update `appId` to match your Apple Developer account bundle ID:
- Format: `com.yourcompany.appname`
- Must be unique on App Store
- Use reverse domain notation

---

## Step 6: Build and Sync

```bash
# Build web app and sync to iOS
npm run build
npx cap sync ios
```

This command:
- Copies your built web app to iOS project
- Updates native dependencies
- Prepares for Xcode

---

## Step 7: Open in Xcode

```bash
# Open the iOS project in Xcode
npx cap open ios
```

Xcode will launch with your project.

---

## Step 8: Configure in Xcode

### A. Set Bundle Identifier

1. In Xcode, select **App** in the project navigator
2. Select **App** target
3. Go to **Signing & Capabilities** tab
4. Set **Bundle Identifier** to your app ID (e.g., `com.prospaces.crm`)

### B. Set Team & Signing

1. Under **Signing & Capabilities**
2. Select your **Team** (Apple Developer account)
3. Enable **Automatically manage signing**

### C. Set App Version

1. Under **General** tab
2. Set **Version**: `1.0`
3. Set **Build**: `1`

### D. Set Deployment Target

1. Under **General** tab
2. Set **Deployment Info** → **iOS**: `14.0` or higher

### E. Configure Permissions

Add these to `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to scan documents</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs photo library access to select images</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs location access for geolocation features</string>

<key>NSContactsUsageDescription</key>
<string>This app needs contacts access to import customer data</string>
```

(Only add permissions your app actually uses)

---

## Step 9: Test on Simulator

### Run in iOS Simulator

1. In Xcode, select a simulator (e.g., **iPhone 15 Pro**)
2. Click the **Play** button (▶️) or press `Cmd + R`
3. Simulator launches with your app

### Test Features

- ✅ Login works
- ✅ Navigation works
- ✅ Data loads from Supabase
- ✅ All modules function
- ✅ Responsive design looks good

---

## Step 10: Test on Physical Device

### Connect iPhone

1. Connect your iPhone via USB
2. Trust the computer on your iPhone
3. In Xcode, select your iPhone from device list

### First Time Setup

1. Xcode may ask to "Register Device"
2. Click **Register Device**
3. Wait for provisioning profile to be created

### Run on Device

1. Click **Play** button (▶️)
2. Xcode builds and installs app on your iPhone
3. First time: Go to **Settings** → **General** → **VPN & Device Management**
4. Trust your developer certificate
5. Open the app on your iPhone

---

## Step 11: Prepare for App Store

### A. Create App Store Connect Record

1. Go to https://appstoreconnect.apple.com
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: ProSpaces CRM
   - **Primary Language**: English
   - **Bundle ID**: (Select your bundle ID)
   - **SKU**: (Unique identifier, e.g., `prospaces-crm-001`)
4. Click **Create**

### B. Add App Information

1. **App Store** tab:
   - App name
   - Subtitle
   - Description
   - Keywords
   - Support URL
   - Marketing URL (optional)

2. **App Privacy** tab:
   - Answer privacy questions
   - Add privacy policy URL

3. **Pricing and Availability**:
   - Set price (Free or paid)
   - Select countries

### C. Prepare Screenshots

Required screenshot sizes (use iPhone simulator):
- **6.7" Display** (iPhone 14 Pro Max, 15 Pro Max)
- **6.5" Display** (iPhone 11 Pro Max, XS Max)
- **5.5" Display** (iPhone 8 Plus)

Capture screenshots: `Cmd + S` in simulator

Tools to generate screenshots:
- https://www.appscreenshots.io/
- https://screenshots.pro/

---

## Step 12: Archive and Upload

### A. Create Archive

1. In Xcode, select **Any iOS Device (arm64)**
2. Go to **Product** → **Archive**
3. Wait for archive to complete (2-5 minutes)

### B. Validate App

1. Xcode Organizer opens automatically
2. Select your archive
3. Click **Validate App**
4. Select distribution method: **App Store Connect**
5. Click **Next** through options
6. Wait for validation (may take a few minutes)
7. Fix any errors if found

### C. Upload to App Store Connect

1. After validation, click **Distribute App**
2. Select **App Store Connect**
3. Click **Next** through options
4. Click **Upload**
5. Wait for upload to complete (5-10 minutes)

---

## Step 13: Submit for Review

### A. Wait for Processing

1. Go to App Store Connect
2. Check **Activity** tab
3. Wait for "Ready to Submit" status (10-30 minutes)

### B. Add Build to Version

1. Go to **App Store** tab
2. Click **+ Version or Platform**
3. Enter version number (e.g., `1.0`)
4. Scroll to **Build** section
5. Click **Select a build**
6. Choose your uploaded build

### C. Complete App Review Information

1. **App Review Information**:
   - First Name, Last Name
   - Phone Number
   - Email Address
   - Demo account (if app requires login)
     - Username: demo@prospaces.com
     - Password: [provide test password]
   
2. **Version Release**:
   - Automatic release or manual release

3. **Submit for Review**:
   - Click **Add for Review**
   - Click **Submit to App Review**

### D. Review Process

- ⏱️ Review typically takes **1-3 days**
- Apple tests your app
- You'll receive email updates
- Common rejection reasons:
  - Missing privacy policy
  - App crashes
  - Misleading screenshots
  - Guideline violations

---

## Quick Commands Reference

```bash
# Initial setup
npm run build
npx cap add ios

# Development workflow
npm run build          # Build web app
npx cap sync ios       # Sync to iOS
npx cap open ios       # Open in Xcode

# Or combined:
npm run build && npx cap sync ios && npx cap open ios

# When you update native dependencies
npx cap sync ios

# When you update web code only
npm run build
npx cap copy ios
```

---

## Configuration Files

### ✅ Created Files

- `capacitor.config.ts` - Capacitor configuration
- `package.json.mobile` - Mobile build scripts (merge into package.json)
- `BUILD_IOS_APP.md` - This guide
- `ios-app-icons/README.md` - Icon requirements

### 📁 Generated Files (after `npx cap add ios`)

- `ios/` - Xcode project folder
- `ios/App/App.xcworkspace` - Open this in Xcode

---

## Environment Variables for iOS

The app will use the same Supabase configuration from your web app:

```typescript
// /utils/supabase/info.tsx
export const projectId = "usorqldwroecyxucmtuw"
export const publicAnonKey = "your-anon-key"
```

These are bundled into the app. For production, ensure they're correctly set.

---

## App Store Assets Checklist

Before submitting:

- [ ] App icon (1024x1024)
- [ ] All icon sizes generated
- [ ] Splash screen
- [ ] Screenshots (6.7", 6.5", 5.5")
- [ ] App description
- [ ] Keywords
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] App demo video (optional but recommended)
- [ ] Promotional text
- [ ] What's new in this version

---

## Troubleshooting

### Build Fails in Xcode

**Error:** "Command PhaseScriptExecution failed"
```bash
cd ios/App
pod install
cd ../..
```

### CocoaPods Issues

```bash
# Update CocoaPods
sudo gem install cocoapods
pod repo update

# Clean and reinstall
cd ios/App
rm -rf Pods
rm Podfile.lock
pod install
cd ../..
```

### Signing Issues

1. Ensure you're logged into Xcode with Apple ID
2. Go to **Xcode** → **Preferences** → **Accounts**
3. Add your Apple ID
4. Download manual provisioning profiles if needed

### App Doesn't Connect to Supabase

1. Check network permissions in Info.plist
2. Verify Supabase URL is using HTTPS
3. Check App Transport Security settings

### Simulator Doesn't Launch

```bash
# Reset simulator
xcrun simctl erase all

# Or reset specific device
xcrun simctl erase "iPhone 15 Pro"
```

---

## Production Checklist

Before releasing to App Store:

- [ ] App tested thoroughly on iPhone
- [ ] All features work offline (if applicable)
- [ ] Loading states implemented
- [ ] Error handling implemented
- [ ] Push notifications tested (if used)
- [ ] Deep linking tested (if used)
- [ ] App icons all look good
- [ ] Splash screen displays correctly
- [ ] No console errors in Xcode
- [ ] Privacy policy created and linked
- [ ] Terms of service created (if needed)
- [ ] Demo account created for reviewers
- [ ] All screenshots look professional
- [ ] App description is clear and accurate

---

## Next Steps After App Store Approval

1. **Celebrate!** 🎉
2. Market your app
3. Gather user feedback
4. Plan updates and new features
5. Monitor crash reports in App Store Connect
6. Respond to user reviews
7. Release updates regularly

---

## Continuous Deployment

### Update Your App

1. Make changes to web app
2. Increment version number in Xcode
3. Build and upload new version
4. Submit for review

```bash
# Quick update workflow
npm run build
npx cap sync ios
npx cap open ios
# Then archive and upload in Xcode
```

---

## Alternative: TestFlight (Beta Testing)

Before full App Store release, test with users via TestFlight:

1. Upload build to App Store Connect (same as Step 12)
2. Don't submit for review yet
3. Go to **TestFlight** tab in App Store Connect
4. Add internal testers (up to 100)
5. Add external testers (up to 10,000)
6. Share TestFlight link
7. Get feedback before public release

---

## Resources

- **Capacitor Docs**: https://capacitorjs.com/docs/ios
- **Apple Developer**: https://developer.apple.com/
- **App Store Connect**: https://appstoreconnect.apple.com/
- **Xcode Documentation**: https://developer.apple.com/xcode/
- **Human Interface Guidelines**: https://developer.apple.com/design/human-interface-guidelines/

---

## Support

**Capacitor Issues:**
- https://github.com/ionic-team/capacitor/issues

**iOS Development:**
- https://developer.apple.com/support/

**App Store Review:**
- https://developer.apple.com/app-store/review/

---

🎉 **You're ready to build your iOS app!**

**Start with:** `npm run build && npx cap add ios && npx cap open ios`
