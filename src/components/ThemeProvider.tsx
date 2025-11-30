import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, getTheme, saveTheme, loadTheme, saveThemeToDatabase, loadThemeFromDatabase } from '../utils/themes';

interface ThemeContextType {
  theme: Theme;
  themeId: string;
  setTheme: (themeId: string) => void;
  userId?: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [themeId, setThemeId] = useState<string>(loadTheme());
  const [theme, setThemeState] = useState<Theme>(getTheme(themeId));
  const [isInitialized, setIsInitialized] = useState(false);

  // Load theme from database on mount if user is logged in
  useEffect(() => {
    const loadUserTheme = async () => {
      if (userId && !isInitialized) {
        const dbTheme = await loadThemeFromDatabase(userId);
        if (dbTheme) {
          setThemeId(dbTheme);
          saveTheme(dbTheme); // Also save to localStorage
        }
        setIsInitialized(true);
      }
    };
    
    loadUserTheme();
  }, [userId, isInitialized]);

  useEffect(() => {
    const newTheme = getTheme(themeId);
    setThemeState(newTheme);
    saveTheme(themeId);
    
    // Apply theme colors to CSS variables
    const root = document.documentElement;
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
  }, [themeId]);

  const handleSetTheme = (newThemeId: string) => {
    setThemeId(newThemeId);
    if (userId) {
      saveThemeToDatabase(newThemeId, userId);
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
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}