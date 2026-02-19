export interface Theme {
  id: string;
  name: string;
  description: string;
  isDark?: boolean; // Whether this is a dark theme (for dark: prefixed Tailwind classes)
  colors: {
    // Background colors
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textMuted: string;
    
    // Primary colors (for buttons, links, etc)
    primary: string;
    primaryHover: string;
    primaryText: string;
    
    // Secondary colors (secondary buttons, badges)
    secondary: string;
    secondaryText: string;
    
    // Accent colors
    accent: string;
    accentHover: string;
    accentText: string;
    
    // Border colors
    border: string;
    borderLight: string;
    
    // Card colors
    card: string;
    cardHover: string;
    cardText: string;
    
    // Input colors
    input: string;
    
    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Destructive
    destructive: string;
    destructiveText: string;
    
    // Navigation
    navBackground: string;
    navText: string;
    navHover: string;
    navActive: string;
    
    // Top bar
    topBarBackground: string;
    topBarText: string;
    
    // Special effects
    gradient?: string;
    shadow: string;
  };
}

export const themes: Record<string, Theme> = {
  vibrant: {
    id: 'vibrant',
    name: 'Vibrant',
    description: 'Colorful gradients with purple and pink accents',
    isDark: false,
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#f9fafb',
      backgroundTertiary: '#f3f4f6',
      
      text: '#111827',
      textSecondary: '#4b5563',
      textMuted: '#9ca3af',
      
      primary: '#9333ea',
      primaryHover: '#7e22ce',
      primaryText: '#ffffff',
      
      secondary: '#f3f4f6',
      secondaryText: '#1f2937',
      
      accent: '#ec4899',
      accentHover: '#db2777',
      accentText: '#ffffff',
      
      border: '#e5e7eb',
      borderLight: '#f3f4f6',
      
      card: '#ffffff',
      cardHover: '#f9fafb',
      cardText: '#111827',
      
      input: '#e5e7eb',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      destructive: '#ef4444',
      destructiveText: '#ffffff',
      
      navBackground: 'linear-gradient(to bottom, #7c3aed, #9333ea)',
      navText: '#ffffff',
      navHover: 'rgba(255, 255, 255, 0.2)',
      navActive: 'rgba(255, 255, 255, 0.3)',
      
      topBarBackground: 'linear-gradient(to right, #7c3aed, #ec4899)',
      topBarText: '#ffffff',
      
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      shadow: '0 10px 15px -3px rgba(147, 51, 234, 0.1), 0 4px 6px -2px rgba(147, 51, 234, 0.05)',
    },
  },
  
  light: {
    id: 'light',
    name: 'Light',
    description: 'Clean and minimal light theme',
    isDark: false,
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#f9fafb',
      backgroundTertiary: '#f3f4f6',
      
      text: '#111827',
      textSecondary: '#4b5563',
      textMuted: '#9ca3af',
      
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryText: '#ffffff',
      
      secondary: '#f1f5f9',
      secondaryText: '#1e293b',
      
      accent: '#3b82f6',
      accentHover: '#2563eb',
      accentText: '#ffffff',
      
      border: '#e5e7eb',
      borderLight: '#f3f4f6',
      
      card: '#ffffff',
      cardHover: '#f9fafb',
      cardText: '#111827',
      
      input: '#e5e7eb',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      destructive: '#ef4444',
      destructiveText: '#ffffff',
      
      navBackground: '#ffffff',
      navText: '#4b5563',
      navHover: '#f3f4f6',
      navActive: '#e5e7eb',
      
      topBarBackground: '#ffffff',
      topBarText: '#111827',
      
      shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    },
  },
  
  dark: {
    id: 'dark',
    name: 'Dark',
    description: 'Easy on the eyes dark theme',
    isDark: true,
    colors: {
      background: '#0f172a',
      backgroundSecondary: '#1e293b',
      backgroundTertiary: '#334155',
      
      text: '#f1f5f9',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      
      primary: '#3b82f6',
      primaryHover: '#2563eb',
      primaryText: '#ffffff',
      
      secondary: '#334155',
      secondaryText: '#f1f5f9',
      
      accent: '#475569',
      accentHover: '#334155',
      accentText: '#f1f5f9',
      
      border: '#334155',
      borderLight: '#475569',
      
      card: '#1e293b',
      cardHover: '#334155',
      cardText: '#f1f5f9',
      
      input: '#334155',
      
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
      
      destructive: '#dc2626',
      destructiveText: '#ffffff',
      
      navBackground: '#1e293b',
      navText: '#cbd5e1',
      navHover: '#334155',
      navActive: '#475569',
      
      topBarBackground: '#1e293b',
      topBarText: '#f1f5f9',
      
      shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    },
  },
  
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calm blue tones inspired by the sea',
    isDark: false,
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#f0f9ff',
      backgroundTertiary: '#e0f2fe',
      
      text: '#0c4a6e',
      textSecondary: '#075985',
      textMuted: '#64748b', // Fixed: was #0891b2 (too vibrant/cyan for "muted")
      
      primary: '#0284c7',
      primaryHover: '#0369a1',
      primaryText: '#ffffff',
      
      secondary: '#e0f2fe',
      secondaryText: '#0c4a6e',
      
      accent: '#06b6d4',
      accentHover: '#0891b2',
      accentText: '#ffffff',
      
      border: '#bae6fd',
      borderLight: '#e0f2fe',
      
      card: '#ffffff',
      cardHover: '#f0f9ff',
      cardText: '#0c4a6e',
      
      input: '#bae6fd',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#0284c7',
      
      destructive: '#ef4444',
      destructiveText: '#ffffff',
      
      navBackground: 'linear-gradient(to bottom, #0284c7, #0369a1)',
      navText: '#ffffff',
      navHover: 'rgba(255, 255, 255, 0.2)',
      navActive: 'rgba(255, 255, 255, 0.3)',
      
      topBarBackground: '#0284c7',
      topBarText: '#ffffff',
      
      gradient: 'linear-gradient(135deg, #667eea 0%, #06b6d4 100%)',
      shadow: '0 10px 15px -3px rgba(2, 132, 199, 0.1), 0 4px 6px -2px rgba(2, 132, 199, 0.05)',
    },
  },
  
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Natural green tones for a fresh look',
    isDark: false,
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#f0fdf4',
      backgroundTertiary: '#dcfce7',
      
      text: '#14532d',
      textSecondary: '#166534',
      textMuted: '#6b7280', // Fixed: was #16a34a (identical to primary - CONFLICT)
      
      primary: '#16a34a',
      primaryHover: '#15803d',
      primaryText: '#ffffff',
      
      secondary: '#f0fdf4',
      secondaryText: '#14532d',
      
      accent: '#22c55e',
      accentHover: '#16a34a',
      accentText: '#ffffff',
      
      border: '#bbf7d0',
      borderLight: '#dcfce7',
      
      card: '#ffffff',
      cardHover: '#f0fdf4',
      cardText: '#14532d',
      
      input: '#bbf7d0',
      
      success: '#0d9488', // Fixed: was #10b981 (too similar to green primary - CONFLICT)
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      destructive: '#ef4444',
      destructiveText: '#ffffff',
      
      navBackground: 'linear-gradient(to bottom, #16a34a, #15803d)',
      navText: '#ffffff',
      navHover: 'rgba(255, 255, 255, 0.2)',
      navActive: 'rgba(255, 255, 255, 0.3)',
      
      topBarBackground: '#16a34a',
      topBarText: '#ffffff',
      
      gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)',
      shadow: '0 10px 15px -3px rgba(22, 163, 74, 0.1), 0 4px 6px -2px rgba(22, 163, 74, 0.05)',
    },
  },
  
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange and red hues',
    isDark: false,
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#fff7ed',
      backgroundTertiary: '#ffedd5',
      
      text: '#7c2d12',
      textSecondary: '#9a3412',
      textMuted: '#78716c', // Fixed: was #c2410c (too close to primary orange - CONFLICT)
      
      primary: '#ea580c',
      primaryHover: '#c2410c',
      primaryText: '#ffffff',
      
      secondary: '#fff7ed',
      secondaryText: '#7c2d12',
      
      accent: '#f97316',
      accentHover: '#ea580c',
      accentText: '#ffffff',
      
      border: '#fed7aa',
      borderLight: '#ffedd5',
      
      card: '#ffffff',
      cardHover: '#fff7ed',
      cardText: '#7c2d12',
      
      input: '#fed7aa',
      
      success: '#10b981',
      warning: '#eab308', // Shifted: was #f59e0b (amber too close to orange primary; now yellow-500)
      error: '#ef4444',
      info: '#3b82f6',
      
      destructive: '#ef4444',
      destructiveText: '#ffffff',
      
      navBackground: 'linear-gradient(to bottom, #ea580c, #c2410c)',
      navText: '#ffffff',
      navHover: 'rgba(255, 255, 255, 0.2)',
      navActive: 'rgba(255, 255, 255, 0.3)',
      
      topBarBackground: '#ea580c',
      topBarText: '#ffffff',
      
      gradient: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
      shadow: '0 10px 15px -3px rgba(234, 88, 12, 0.1), 0 4px 6px -2px rgba(234, 88, 12, 0.05)',
    },
  },
  
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep dark theme with blue accents',
    isDark: true,
    colors: {
      background: '#020617',
      backgroundSecondary: '#0f172a',
      backgroundTertiary: '#1e293b',
      
      text: '#e2e8f0',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      
      primary: '#6366f1',
      primaryHover: '#4f46e5',
      primaryText: '#ffffff',
      
      secondary: '#1e293b',
      secondaryText: '#e2e8f0',
      
      accent: '#334155',
      accentHover: '#1e293b',
      accentText: '#e2e8f0',
      
      border: '#1e293b',
      borderLight: '#334155',
      
      card: '#0f172a',
      cardHover: '#1e293b',
      cardText: '#e2e8f0',
      
      input: '#1e293b',
      
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#818cf8',
      
      destructive: '#dc2626',
      destructiveText: '#ffffff',
      
      navBackground: '#0f172a',
      navText: '#cbd5e1',
      navHover: '#1e293b',
      navActive: '#334155',
      
      topBarBackground: '#0f172a',
      topBarText: '#e2e8f0',
      
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    },
  },
};

export const getTheme = (themeId: string): Theme => {
  return themes[themeId] || themes.light;
};

export const saveTheme = (themeId: string): void => {
  localStorage.setItem('prospace-theme', themeId);
};

export const loadTheme = (): string => {
  return localStorage.getItem('prospace-theme') || 'vibrant';
};

// Save theme to database for persistence across devices
export const saveThemeToDatabase = async (themeId: string, userId: string): Promise<void> => {
  try {
    const { createClient } = await import('./supabase/client');
    const supabase = createClient();
    
    const { error } = await supabase
      .from('profiles')
      .update({ theme: themeId })
      .eq('id', userId);
    
    if (error) {
      console.error('Error saving theme to database:', error);
    } else {
      console.log('Theme saved to database:', themeId);
    }
  } catch (error) {
    console.error('Error saving theme to database:', error);
  }
};

// Load theme from database for current user
export const loadThemeFromDatabase = async (userId: string): Promise<string | null> => {
  try {
    const { createClient } = await import('./supabase/client');
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('theme')
      .eq('id', userId)
      .single();
    
    if (error || !data?.theme) {
      return null;
    }
    
    return data.theme;
  } catch (error) {
    console.error('Error loading theme from database:', error);
    return null;
  }
};
