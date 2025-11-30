// Mobile utilities for Capacitor iOS app

import { Capacitor } from '@capacitor/core';

/**
 * Check if app is running as native mobile app
 */
export const isMobileApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Check if running on iOS
 */
export const isIOS = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Check if running on Android
 */
export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Check if running in web browser
 */
export const isWeb = (): boolean => {
  return Capacitor.getPlatform() === 'web';
};

/**
 * Get platform name
 */
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

/**
 * Safe area insets for iPhone notch/dynamic island
 */
export const getSafeAreaInsets = () => {
  if (isIOS()) {
    return {
      top: 'env(safe-area-inset-top)',
      bottom: 'env(safe-area-inset-bottom)',
      left: 'env(safe-area-inset-left)',
      right: 'env(safe-area-inset-right)',
    };
  }
  return { top: '0px', bottom: '0px', left: '0px', right: '0px' };
};

/**
 * Initialize mobile app features
 */
export const initializeMobileApp = async () => {
  if (!isMobileApp()) return;

  try {
    // Status bar styling (iOS)
    if (isIOS()) {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.setStyle({ style: 'light' });
      await StatusBar.setBackgroundColor({ color: '#2563eb' });
    }

    // Hide splash screen
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();

    // Configure keyboard
    const { Keyboard } = await import('@capacitor/keyboard');
    await Keyboard.setResizeMode({ mode: 'body' });

    console.log('✅ Mobile app initialized');
  } catch (error) {
    console.warn('Mobile features not available:', error);
  }
};

/**
 * Handle back button (Android)
 */
export const setupBackButton = (handler: () => void) => {
  if (!isMobileApp()) return;

  import('@capacitor/app').then(({ App }) => {
    App.addListener('backButton', handler);
  });
};

/**
 * Share content from app
 */
export const shareContent = async (title: string, text: string, url?: string) => {
  if (!isMobileApp()) {
    // Fallback to Web Share API
    if (navigator.share) {
      return navigator.share({ title, text, url });
    }
    return;
  }

  const { Share } = await import('@capacitor/share');
  await Share.share({
    title,
    text,
    url,
    dialogTitle: 'Share with',
  });
};

/**
 * Store data locally (persists across app restarts)
 */
export const storeData = async (key: string, value: string) => {
  if (!isMobileApp()) {
    localStorage.setItem(key, value);
    return;
  }

  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key, value });
};

/**
 * Retrieve stored data
 */
export const getData = async (key: string): Promise<string | null> => {
  if (!isMobileApp()) {
    return localStorage.getItem(key);
  }

  const { Preferences } = await import('@capacitor/preferences');
  const { value } = await Preferences.get({ key });
  return value;
};

/**
 * Remove stored data
 */
export const removeData = async (key: string) => {
  if (!isMobileApp()) {
    localStorage.removeItem(key);
    return;
  }

  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.remove({ key });
};

/**
 * Open URL in system browser (instead of in-app)
 */
export const openInBrowser = async (url: string) => {
  if (!isMobileApp()) {
    window.open(url, '_blank');
    return;
  }

  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url });
};

/**
 * Get app info
 */
export const getAppInfo = async () => {
  if (!isMobileApp()) {
    return { version: 'web', build: 'web' };
  }

  const { App } = await import('@capacitor/app');
  return await App.getInfo();
};

// Export platform constants
export const MOBILE = {
  isApp: isMobileApp(),
  isIOS: isIOS(),
  isAndroid: isAndroid(),
  isWeb: isWeb(),
  platform: getPlatform(),
};
