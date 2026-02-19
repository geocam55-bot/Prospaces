import { useTheme } from './ThemeProvider';
import { themes, type Theme } from '../utils/themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Loader2, Moon, Sun } from 'lucide-react';
import { useState } from 'react';

function ThemePreviewSwatch({ theme }: { theme: Theme }) {
  const c = theme.colors;
  
  return (
    <div className="mb-3 rounded-md overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Simulated page layout */}
      <div className="h-28 flex" style={{ background: c.background }}>
        {/* Sidebar preview */}
        <div className="w-8 flex-shrink-0 flex flex-col gap-0.5 p-1" style={{ background: c.navBackground.includes('gradient') ? undefined : c.navBackground, backgroundImage: c.navBackground.includes('gradient') ? c.navBackground : undefined }}>
          {[1,2,3,4].map(i => (
            <div
              key={i}
              className="h-2 rounded-sm"
              style={{ background: i === 1 ? c.navActive : 'rgba(255,255,255,0.15)' }}
            />
          ))}
        </div>
        {/* Content area */}
        <div className="flex-1 p-1.5 flex flex-col gap-1">
          {/* Top bar */}
          <div className="h-3 rounded-sm flex items-center px-1" style={{ background: c.backgroundSecondary }}>
            <div className="h-1.5 w-8 rounded-sm" style={{ background: c.textMuted }} />
          </div>
          {/* Cards */}
          <div className="flex-1 flex gap-1">
            <div className="flex-1 rounded-sm p-1 flex flex-col gap-0.5" style={{ background: c.card, border: `1px solid ${c.border}` }}>
              <div className="h-1.5 w-6 rounded-sm" style={{ background: c.text }} />
              <div className="h-1 w-10 rounded-sm" style={{ background: c.textSecondary }} />
              <div className="h-1 w-8 rounded-sm" style={{ background: c.textMuted }} />
              <div className="flex gap-0.5 mt-auto">
                <div className="h-2.5 w-6 rounded-sm" style={{ background: c.primary }} />
                <div className="h-2.5 w-6 rounded-sm" style={{ background: c.secondary, border: `1px solid ${c.border}` }} />
              </div>
            </div>
            <div className="flex-1 rounded-sm p-1 flex flex-col gap-0.5" style={{ background: c.card, border: `1px solid ${c.border}` }}>
              <div className="h-1.5 w-5 rounded-sm" style={{ background: c.text }} />
              <div className="flex gap-0.5 mt-1">
                <div className="h-2 w-4 rounded-sm" style={{ background: c.success }} />
                <div className="h-2 w-4 rounded-sm" style={{ background: c.warning }} />
                <div className="h-2 w-4 rounded-sm" style={{ background: c.error }} />
              </div>
              <div className="flex gap-0.5 mt-auto">
                <div className="h-2 w-4 rounded-full" style={{ background: c.accent }} />
                <div className="h-2 w-4 rounded-full" style={{ background: c.info }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeSelector() {
  const { themeId, setTheme } = useTheme();
  const [savingTheme, setSavingTheme] = useState<string | null>(null);

  const handleThemeChange = async (newThemeId: string) => {
    setSavingTheme(newThemeId);
    setTheme(newThemeId);
    
    // Add a brief delay to show the loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    setSavingTheme(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose a theme that suits your style. Changes are saved automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(themes).map((theme) => {
            const isActive = themeId === theme.id;
            const isSaving = savingTheme === theme.id;
            
            return (
              <button
                key={theme.id}
                onClick={() => handleThemeChange(theme.id)}
                disabled={isSaving}
                className={`relative p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                  isActive
                    ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50 dark:bg-blue-950 dark:ring-blue-800'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                } ${isSaving ? 'opacity-75 cursor-wait' : ''}`}
              >
                {isActive && !isSaving && (
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center animate-in zoom-in duration-200">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
                
                {isSaving && (
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                )}
                
                {/* Theme Preview */}
                <ThemePreviewSwatch theme={theme} />
                
                {/* Theme Info */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1.5">
                      {theme.name}
                      {theme.isDark && <Moon className="h-3.5 w-3.5 text-gray-400" />}
                      {!theme.isDark && <Sun className="h-3.5 w-3.5 text-amber-400" />}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{theme.description}</p>
                  </div>
                </div>
                
                {/* Color Palette Preview */}
                <div className="flex gap-1.5 mt-3">
                  <div 
                    className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm" 
                    style={{ background: theme.colors.primary }}
                    title="Primary"
                  />
                  <div 
                    className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm" 
                    style={{ background: theme.colors.accent }}
                    title="Accent"
                  />
                  <div 
                    className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm" 
                    style={{ background: theme.colors.success }}
                    title="Success"
                  />
                  <div 
                    className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm" 
                    style={{ background: theme.colors.warning }}
                    title="Warning"
                  />
                  <div 
                    className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm" 
                    style={{ background: theme.colors.error }}
                    title="Error"
                  />
                  <div 
                    className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm" 
                    style={{ background: theme.colors.background }}
                    title="Background"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
