import { useTheme } from './ThemeProvider';
import { themes } from '../utils/themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';

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
                    ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
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
                <div className="mb-3 h-20 rounded-md overflow-hidden border border-gray-200">
                  <div 
                    className="h-full w-full"
                    style={{
                      background: theme.colors.gradient || theme.colors.primary,
                    }}
                  />
                </div>
                
                {/* Theme Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{theme.name}</h3>
                  <p className="text-xs text-gray-600">{theme.description}</p>
                </div>
                
                {/* Color Palette Preview */}
                <div className="flex gap-1 mt-3">
                  <div 
                    className="h-4 w-4 rounded-full border border-gray-200" 
                    style={{ 
                      background: theme.colors.primary.includes('gradient') 
                        ? theme.colors.accent 
                        : theme.colors.primary 
                    }}
                  />
                  <div 
                    className="h-4 w-4 rounded-full border border-gray-200" 
                    style={{ background: theme.colors.success }}
                  />
                  <div 
                    className="h-4 w-4 rounded-full border border-gray-200" 
                    style={{ background: theme.colors.warning }}
                  />
                  <div 
                    className="h-4 w-4 rounded-full border border-gray-200" 
                    style={{ background: theme.colors.error }}
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