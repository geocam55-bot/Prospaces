/**
 * PWA Utilities
 * Handles service worker registration, install prompts, and offline detection
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/**
 * Detect if the user is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function listenForNetworkChanges(
  onOnline?: () => void,
  onOffline?: () => void
): () => void {
  const handleOnline = () => {
    console.log('[PWA] Network online');
    if (onOnline) onOnline();
  };

  const handleOffline = () => {
    console.log('[PWA] Network offline');
    if (onOffline) onOffline();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Check if the app is installed as a PWA
 */
export function isInstalled(): boolean {
  // Check if running in standalone mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check for iOS standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  return isStandalone || isIOSStandalone;
}

/**
 * Listen for install prompt
 */
export function listenForInstallPrompt(
  onPromptAvailable?: (prompt: BeforeInstallPromptEvent) => void
): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default mini-infobar
    e.preventDefault();
    
    // Save the event for later use
    deferredPrompt = e as BeforeInstallPromptEvent;
    
    console.log('[PWA] Install prompt available');
    
    if (onPromptAvailable) {
      onPromptAvailable(deferredPrompt);
    }
  });
}

/**
 * Show the install prompt
 */
export async function showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) {
    console.warn('[PWA] Install prompt not available');
    return 'unavailable';
  }

  try {
    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`[PWA] Install prompt ${outcome}`);

    // Clear the saved prompt
    deferredPrompt = null;

    return outcome;
  } catch (error) {
    console.error('[PWA] Error showing install prompt:', error);
    return 'unavailable';
  }
}

/**
 * Detect if the user is on iOS
 */
export function isIOS(): boolean {
  const ua = window.navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return isIOSDevice && !(window as any).MSStream;
}

/**
 * Detect if the user is on Android
 */
export function isAndroid(): boolean {
  return /Android/.test(window.navigator.userAgent);
}

/**
 * Get iOS installation instructions
 */
export function getIOSInstallInstructions(): string[] {
  return [
    'Tap the Share button at the bottom of Safari',
    'Scroll down and tap "Add to Home Screen"',
    'Tap "Add" in the top right corner',
    'ProSpaces CRM will appear on your home screen'
  ];
}

/**
 * Get platform-specific install instructions
 */
export function getInstallInstructions(): string[] {
  if (isIOS()) {
    return getIOSInstallInstructions();
  }
  
  if (isAndroid()) {
    return [
      'Tap the menu button (⋮) in Chrome',
      'Tap "Install app" or "Add to Home screen"',
      'Tap "Install" to confirm',
      'ProSpaces CRM will appear on your home screen'
    ];
  }
  
  return [
    'Click the install icon in your browser\'s address bar',
    'Or click the menu and select "Install ProSpaces CRM"',
    'The app will be installed on your computer'
  ];
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Don't even try in non-HTTPS or preview environments
  const isHTTPS = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
  const isFigmaPreview = window.location.hostname.includes('figma.site') ||
                        window.location.hostname.includes('figmaiframepreview') ||
                        window.location !== window.parent.location;
  
  // Service workers only work on HTTPS or localhost, and not in iframes
  if (!isHTTPS && !isLocalhost) {
    return null;
  }
  
  if (isFigmaPreview) {
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Check every hour

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          console.log('[PWA] New version available! Please refresh.');
          
          // Notify user about update
          if (confirm('A new version of ProSpaces CRM is available. Reload to update?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });

    return registration;
  } catch (error) {
    // Silently handle registration errors - PWA features are optional
    return null;
  }
}

/**
 * Unregister all service workers (for debugging)
 */
export async function unregisterServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
  }
  console.log('[PWA] All service workers unregistered');
}

/**
 * Check if the app can be installed
 */
export function canInstall(): boolean {
  return deferredPrompt !== null || !isInstalled();
}

/**
 * Clear all caches (for debugging)
 */
export async function clearCaches(): Promise<void> {
  if (!('caches' in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  
  console.log('[PWA] All caches cleared');
}

/**
 * Get cache size
 */
export async function getCacheSize(): Promise<number> {
  if (!('caches' in window)) return 0;

  let totalSize = 0;
  const cacheNames = await caches.keys();

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if the browser supports PWA features
 */
export function checkPWASupport(): {
  serviceWorker: boolean;
  manifest: boolean;
  notifications: boolean;
  backgroundSync: boolean;
  pushNotifications: boolean;
} {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    manifest: 'manifest' in document.createElement('link'),
    notifications: 'Notification' in window,
    backgroundSync: 'sync' in (self as any).registration || false,
    pushNotifications: 'PushManager' in window,
  };
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[PWA] Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    console.log('[PWA] Notification permission:', permission);
    return permission;
  }

  return Notification.permission;
}

/**
 * Show a notification
 */
export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  const permission = await requestNotificationPermission();
  
  if (permission !== 'granted') {
    console.warn('[PWA] Notification permission denied');
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    ...options,
  });
}
