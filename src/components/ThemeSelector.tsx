import { useTheme } from './ThemeProvider';
import { themes } from '../utils/themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Check } from 'lucide-react';

export function ThemeSelector() {
  const { themeId, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Choose a theme that suits your style
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(themes).map((theme) => (
            <button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={`relative p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                themeId === theme.id
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {themeId === theme.id && (
                <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="h-4 w-4 text-white" />
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
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
