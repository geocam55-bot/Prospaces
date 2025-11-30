# iOS App Icons Required

To build the iOS app, you'll need app icons in various sizes.

## Required Sizes

Place these icon files in the `ios/App/App/Assets.xcassets/AppIcon.appiconset/` directory after running `npx cap add ios`:

- **20x20** - Icon-20.png (Notifications - 2x)
- **20x20** - Icon-20@2x.png (Notifications - 3x)
- **20x20** - Icon-20@3x.png (Notifications - 3x)
- **29x29** - Icon-29.png (Settings - 1x)
- **29x29** - Icon-29@2x.png (Settings - 2x)
- **29x29** - Icon-29@3x.png (Settings - 3x)
- **40x40** - Icon-40.png (Spotlight - 1x)
- **40x40** - Icon-40@2x.png (Spotlight - 2x)
- **40x40** - Icon-40@3x.png (Spotlight - 3x)
- **60x60** - Icon-60@2x.png (iPhone App - 2x)
- **60x60** - Icon-60@3x.png (iPhone App - 3x)
- **76x76** - Icon-76.png (iPad App - 1x)
- **76x76** - Icon-76@2x.png (iPad App - 2x)
- **83.5x83.5** - Icon-83.5@2x.png (iPad Pro)
- **1024x1024** - Icon-1024.png (App Store)

## Quick Generator

Use an online tool to generate all sizes from one 1024x1024 icon:
- https://www.appicon.co/
- https://makeappicon.com/
- https://icon.kitchen/

## Design Guidelines

- Use a simple, recognizable design
- No transparency (use solid background)
- Square image (1:1 aspect ratio)
- High contrast for visibility
- Consider how it looks at small sizes
