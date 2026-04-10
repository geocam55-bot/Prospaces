import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { useTheme } from './ThemeProvider';
import { Theme, getTheme, themes } from '../utils/themes';
import { sendSystemNotification } from '../utils/notifications';

interface ThemeEditorProps {
  themeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const colorGroups = [
  {
    title: 'Background',
    keys: ['background', 'backgroundSecondary', 'backgroundTertiary'],
  },
  {
    title: 'Text',
    keys: ['text', 'textSecondary', 'textMuted'],
  },
  {
    title: 'Primary',
    keys: ['primary', 'primaryHover', 'primaryText'],
  },
  {
    title: 'Secondary',
    keys: ['secondary', 'secondaryText'],
  },
  {
    title: 'Accent',
    keys: ['accent', 'accentHover', 'accentText'],
  },
  {
    title: 'Border & Input',
    keys: ['border', 'borderLight', 'input'],
  },
  {
    title: 'Card',
    keys: ['card', 'cardHover', 'cardText'],
  },
  {
    title: 'Status',
    keys: ['success', 'warning', 'error', 'info'],
  },
  {
    title: 'Destructive',
    keys: ['destructive', 'destructiveText'],
  },
  {
    title: 'Navigation',
    keys: ['navBackground', 'navText', 'navHover', 'navActive'],
  },
  {
    title: 'Top Bar',
    keys: ['topBarBackground', 'topBarText'],
  },
  {
    title: 'Special Effects',
    keys: ['gradient', 'shadow'],
  },
] as const;

export function ThemeEditor({ themeId, open, onOpenChange }: ThemeEditorProps) {
  const { theme, updateThemeColors } = useTheme();
  const [colors, setColors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && themeId) {
      const activeTheme = getTheme(themeId);
      setColors(activeTheme.colors as unknown as Record<string, string>);
    }
  }, [open, themeId]);

  const handleChange = (key: string, value: string) => {
    setColors(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (themeId) {
      updateThemeColors(themeId, colors as Partial<Theme['colors']>);
      sendSystemNotification('Theme Saved!', { 
        body: 'Your custom color theme has been applied successfully.',
        icon: '/favicon.ico'
      });
    }
    onOpenChange(false);
  };

  if (!themeId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col gap-0 p-0 sm:rounded-xl shadow-2xl overflow-hidden bg-background dark:bg-slate-950 text-foreground border-border">
        <div className="p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle>Edit Theme Colors</DialogTitle>
            <DialogDescription>
              Customize the active colors for this theme. Changes will be saved locally.
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0 p-6 kitchen-planner-scroll">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-4">
            {colorGroups.map(group => (
              <div key={group.title} className="space-y-3">
                <h4 className="font-semibold text-sm text-muted-foreground border-b pb-1">
                  {group.title}
                </h4>
                <div className="space-y-2.5">
                  {group.keys.map(key => {
                    const value = colors[key] || '';
                    const isColor = value.startsWith('#') || value.startsWith('rgb');
                    const isComplex = !value.startsWith('#') && value.length > 0;
                    
                    return (
                      <div key={key} className="flex flex-col gap-1.5">
                        <Label className="text-xs font-medium">{key}</Label>
                        <div className="flex items-center gap-2">
                          {!isComplex && (
                            <div className="relative w-8 h-8 rounded border shadow-sm overflow-hidden flex-shrink-0">
                              <input
                                type="color"
                                value={value.startsWith('#') && value.length === 7 ? value : '#000000'}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className="absolute inset-[-10px] w-[50px] h-[50px] cursor-pointer"
                              />
                            </div>
                          )}
                          <Input
                            value={value}
                            onChange={(e) => handleChange(key, e.target.value)}
                            className="h-8 text-xs flex-1 font-mono"
                            placeholder={isComplex ? 'e.g. linear-gradient(...)' : '#000000'}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t flex justify-between gap-2 rounded-b-xl bg-muted/20">
          <Button 
            variant="ghost" 
            className="text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (themeId) {
                // Delete custom colors from localStorage
                localStorage.removeItem(`prospace-theme-custom-${themeId}`);
                // Refresh local state to defaults
                const baseTheme = themes[themeId] || themes.vibrant;
                setColors(baseTheme.colors as unknown as Record<string, string>);
              }
            }}
          >
            Reset to Default
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Colors</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
