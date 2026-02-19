export interface Theme {
  id: string;
  name: string;
  description: string;
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
    
    // Accent colors
    accent: string;
    accentHover: string;
    
    // Border colors
    border: string;
    borderLight: string;
    
    // Card colors
    card: string;
    cardHover: string;
    
    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
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
      
      accent: '#ec4899',
      accentHover: '#db2777',
      
      border: '#e5e7eb',
      borderLight: '#f3f4f6',
      
      card: '#ffffff',
      cardHover: '#f9fafb',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
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
      
      accent: '#3b82f6',
      accentHover: '#2563eb',
      
      border: '#e5e7eb',
      borderLight: '#f3f4f6',
      
      card: '#ffffff',
      cardHover: '#f9fafb',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
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
      
      accent: '#3b82f6',
      accentHover: '#2563eb',
      
      border: '#334155',
      borderLight: '#475569',
      
      card: '#1e293b',
      cardHover: '#334155',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
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
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#f0f9ff',
      backgroundTertiary: '#e0f2fe',
      
      text: '#0c4a6e',
      textSecondary: '#075985',
      textMuted: '#0891b2',
      
      primary: '#0284c7',
      primaryHover: '#0369a1',
      primaryText: '#ffffff',
      
      accent: '#06b6d4',
      accentHover: '#0891b2',
      
      border: '#bae6fd',
      borderLight: '#e0f2fe',
      
      card: '#ffffff',
      cardHover: '#f0f9ff',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#0284c7',
      
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
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#f0fdf4',
      backgroundTertiary: '#dcfce7',
      
      text: '#14532d',
      textSecondary: '#166534',
      textMuted: '#16a34a',
      
      primary: '#16a34a',
      primaryHover: '#15803d',
      primaryText: '#ffffff',
      
      accent: '#22c55e',
      accentHover: '#16a34a',
      
      border: '#bbf7d0',
      borderLight: '#dcfce7',
      
      card: '#ffffff',
      cardHover: '#f0fdf4',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
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
    colors: {
      background: '#ffffff',
      backgroundSecondary: '#fff7ed',
      backgroundTertiary: '#ffedd5',
      
      text: '#7c2d12',
      textSecondary: '#9a3412',
      textMuted: '#c2410c',
      
      primary: '#ea580c',
      primaryHover: '#c2410c',
      primaryText: '#ffffff',
      
      accent: '#f97316',
      accentHover: '#ea580c',
      
      border: '#fed7aa',
      borderLight: '#ffedd5',
      
      card: '#ffffff',
      cardHover: '#fff7ed',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
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
      
      accent: '#818cf8',
      accentHover: '#6366f1',
      
      border: '#1e293b',
      borderLight: '#334155',
      
      card: '#0f172a',
      cardHover: '#1e293b',
      
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#6366f1',
      
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