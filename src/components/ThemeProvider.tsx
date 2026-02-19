import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, getTheme, saveTheme, loadTheme, saveThemeToDatabase, loadThemeFromDatabase } from '../utils/themes';

// Fallback theme used when useTheme is called outside of ThemeProvider
// (e.g. during hot-reload boundary resets)
const fallbackTheme = getTheme('vibrant');
const fallbackContext: ThemeContextType = {
  theme: fallbackTheme,
  themeId: 'vibrant',
  setTheme: () => {},
};

interface ThemeContextType {
  theme: Theme;
  themeId: string;
  setTheme: (themeId: string) => void;
  userId?: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Convert hex to HSL format for Tailwind CSS variables
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `${h} ${s}% ${l}%`;
}

export function ThemeProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [themeId, setThemeId] = useState<string>(loadTheme());
  const [theme, setThemeState] = useState<Theme>(getTheme(themeId));

  // Load theme from database on mount if user is logged in
  useEffect(() => {
    const loadUserTheme = async () => {
      if (userId) {
        console.log('Loading theme for user:', userId);
        const dbTheme = await loadThemeFromDatabase(userId);
        if (dbTheme) {
          console.log('Loaded theme from database:', dbTheme);
          setThemeId(dbTheme);
          saveTheme(dbTheme); // Also save to localStorage
        } else {
          console.log('No theme found in database, using localStorage or default');
          // Use localStorage theme if no database theme exists
          const localTheme = loadTheme();
          setThemeId(localTheme);
        }
      } else {
        console.log('No user ID, loading theme from localStorage');
        // If no user, load from localStorage
        const localTheme = loadTheme();
        setThemeId(localTheme);
      }
    };
    
    loadUserTheme();
  }, [userId]);

  useEffect(() => {
    const newTheme = getTheme(themeId);
    setThemeState(newTheme);
    saveTheme(themeId);
    console.log('Applying theme:', themeId);
    
    // Apply theme colors to CSS variables
    const root = document.documentElement;
    
    // ─── Toggle dark class for dark: prefixed Tailwind classes ───
    if (newTheme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // ─── Set hex color variables (for direct use) ───
    root.style.setProperty('--color-background', newTheme.colors.background);
    root.style.setProperty('--color-background-secondary', newTheme.colors.backgroundSecondary);
    root.style.setProperty('--color-background-tertiary', newTheme.colors.backgroundTertiary);
    root.style.setProperty('--color-text', newTheme.colors.text);
    root.style.setProperty('--color-text-secondary', newTheme.colors.textSecondary);
    root.style.setProperty('--color-text-muted', newTheme.colors.textMuted);
    root.style.setProperty('--color-primary', newTheme.colors.primary);
    root.style.setProperty('--color-primary-hover', newTheme.colors.primaryHover);
    root.style.setProperty('--color-primary-text', newTheme.colors.primaryText);
    root.style.setProperty('--color-accent', newTheme.colors.accent);
    root.style.setProperty('--color-accent-hover', newTheme.colors.accentHover);
    root.style.setProperty('--color-border', newTheme.colors.border);
    root.style.setProperty('--color-border-light', newTheme.colors.borderLight);
    root.style.setProperty('--color-card', newTheme.colors.card);
    root.style.setProperty('--color-card-hover', newTheme.colors.cardHover);
    root.style.setProperty('--color-success', newTheme.colors.success);
    root.style.setProperty('--color-warning', newTheme.colors.warning);
    root.style.setProperty('--color-error', newTheme.colors.error);
    root.style.setProperty('--color-info', newTheme.colors.info);
    root.style.setProperty('--color-nav-background', newTheme.colors.navBackground);
    root.style.setProperty('--color-nav-text', newTheme.colors.navText);
    root.style.setProperty('--color-nav-hover', newTheme.colors.navHover);
    root.style.setProperty('--color-nav-active', newTheme.colors.navActive);
    root.style.setProperty('--color-topbar-background', newTheme.colors.topBarBackground);
    root.style.setProperty('--color-topbar-text', newTheme.colors.topBarText);
    root.style.setProperty('--shadow', newTheme.colors.shadow);
    
    if (newTheme.colors.gradient) {
      root.style.setProperty('--gradient', newTheme.colors.gradient);
    }
    
    // ─── Set ALL Tailwind HSL variables consumed by UI components ───
    // Background / Foreground
    root.style.setProperty('--background', hexToHSL(newTheme.colors.background));
    root.style.setProperty('--foreground', hexToHSL(newTheme.colors.text));
    
    // Card
    root.style.setProperty('--card', hexToHSL(newTheme.colors.card));
    root.style.setProperty('--card-foreground', hexToHSL(newTheme.colors.cardText));
    
    // Popover (same as card)
    root.style.setProperty('--popover', hexToHSL(newTheme.colors.card));
    root.style.setProperty('--popover-foreground', hexToHSL(newTheme.colors.cardText));
    
    // Primary
    root.style.setProperty('--primary', hexToHSL(newTheme.colors.primary));
    root.style.setProperty('--primary-foreground', hexToHSL(newTheme.colors.primaryText));
    
    // Secondary (PREVIOUSLY MISSING - caused light buttons on dark themes)
    root.style.setProperty('--secondary', hexToHSL(newTheme.colors.secondary));
    root.style.setProperty('--secondary-foreground', hexToHSL(newTheme.colors.secondaryText));
    
    // Muted
    root.style.setProperty('--muted', hexToHSL(newTheme.colors.backgroundTertiary));
    root.style.setProperty('--muted-foreground', hexToHSL(newTheme.colors.textMuted));
    
    // Accent (ACCENT-FOREGROUND PREVIOUSLY MISSING - caused dark hover text on dark themes)
    root.style.setProperty('--accent', hexToHSL(newTheme.colors.accent));
    root.style.setProperty('--accent-foreground', hexToHSL(newTheme.colors.accentText));
    
    // Destructive (PREVIOUSLY MISSING)
    root.style.setProperty('--destructive', hexToHSL(newTheme.colors.destructive));
    root.style.setProperty('--destructive-foreground', hexToHSL(newTheme.colors.destructiveText));
    
    // Border & Input
    root.style.setProperty('--border', hexToHSL(newTheme.colors.border));
    root.style.setProperty('--input', hexToHSL(newTheme.colors.input));
    
    // Ring
    root.style.setProperty('--ring', hexToHSL(newTheme.colors.primary));
  }, [themeId]);

  const handleSetTheme = async (newThemeId: string) => {
    console.log('Setting theme to:', newThemeId);
    setThemeId(newThemeId);
    saveTheme(newThemeId); // Save to localStorage immediately
    
    if (userId) {
      console.log('Saving theme to database for user:', userId);
      await saveThemeToDatabase(newThemeId, userId);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme: handleSetTheme, userId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return a safe fallback instead of throwing so hot-reload and
    // component-tree race conditions don't crash the app.
    console.warn('useTheme called outside ThemeProvider – using fallback theme');
    return fallbackContext;
  }
  return context;
}