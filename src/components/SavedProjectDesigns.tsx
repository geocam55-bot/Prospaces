import React, { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { FileText, Trash2, Download, Save, User } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import type { User as AppUser } from '../App';

interface SavedProjectDesignsProps {
  user: AppUser;
  projectType: string;
  currentConfig: any;
  materials?: any[];
  totalCost?: number;
  onLoadDesign: (config: any, designInfo?: {
    name?: string;
    description?: string;
    customerName?: string;
    customerCompany?: string;
  }) => void;
}

interface SavedDesign {
  id: string;
  name: string;
  description: string;
  config: any;
  total_cost: number;
  materials: any[];
  created_at: string;
  updated_at: string;
}

export function SavedProjectDesigns({ 
  user,
  projectType,
  currentConfig, 
  materials = [],
  totalCost = 0,
  onLoadDesign 
}: SavedProjectDesignsProps) {
  const [designs, setDesigns] = useState<SavedDesign[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user.organizationId) {
      loadDesigns();
    }
  }, [user.organizationId, projectType]);

  const loadDesigns = async () => {
    if (!user.organizationId) return;

    setIsLoading(true);
    setSaveMessage('');
    
    try {
      const prefix = `project_design:${user.organizationId}:${projectType}:`;
      const { data, error } = await createClient()
        .from('kv_store_8405be07')
        .select('key, value')
        .like('key', `${prefix}%`)
        .order('key', { ascending: false }); // Poor man's sort by date since we embed timestamp in key

      if (error) {
        setSaveMessage('Failed to load saved designs.');
        return;
      }

      if (data) {
        const parsedDesigns = data.map(row => {
          let value = row.value;
          if (typeof value === 'string') {
            try { value = JSON.parse(value); } catch (e) {}
          }
          return {
            id: row.key,
            ...value
          };
        });
        
        // Sort by created_at
        parsedDesigns.sort((a, b) => {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        });

        setDesigns(parsedDesigns);
      }
    } catch (err: any) {
      setSaveMessage('An unexpected error occurred while loading.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDesign = async () => {
    if (!saveName.trim()) {
      setSaveMessage('Please enter a name for this design');
      return;
    }

    if (!user.organizationId) {
      setSaveMessage('Organization ID is required to save designs');
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const timestamp = new Date().toISOString();
      const designId = `project_design:${user.organizationId}:${projectType}:${Date.now()}`;
      
      const designData = {
        name: saveName,
        description: saveDescription,
        config: currentConfig,
        total_cost: totalCost,
        materials: materials,
        created_at: timestamp,
        updated_at: timestamp
      };

      const { error } = await createClient()
        .from('kv_store_8405be07')
        .upsert({
          key: designId,
          value: designData
        });

      if (error) throw error;

      setSaveName('');
      setSaveDescription('');
      setSaveMessage('Design saved successfully!');
      loadDesigns();
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error: any) {
      setSaveMessage(error.message || 'Failed to save design');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDesign = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this saved design?')) return;
    
    try {
      const { error } = await createClient()
        .from('kv_store_8405be07')
        .delete()
        .eq('key', id);

      if (error) throw error;
      loadDesigns();
    } catch (error) {
      alert('Failed to delete design');
    }
  };

  return (
    <div className="space-y-6 print:hidden">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Save className="w-5 h-5" />
            Save Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {saveMessage && (
            <Alert variant={saveMessage.includes('success') ? 'default' : 'destructive'} className="py-2">
              <AlertDescription>{saveMessage}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-3">
            <div>
              <Label htmlFor="design-name">Configuration Name *</Label>
              <Input
                id="design-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={`e.g. Smith ${projectType.charAt(0).toUpperCase() + projectType.slice(1)}`}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="design-notes">Notes (Optional)</Label>
              <Textarea
                id="design-notes"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder="Any special requirements or details..."
                className="mt-1 h-20"
              />
            </div>

            <Button 
              onClick={handleSaveDesign} 
              disabled={isSaving || !saveName.trim()}
              className="w-full mt-2"
            >
              {isSaving ? 'Saving...' : 'Save Draft Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {designs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Saved Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {designs.map((design) => (
                  <div key={design.id} className="border rounded-md p-3 hover:bg-muted transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-sm text-foreground">{design.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(design.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onLoadDesign(design.config, {
                            name: design.name,
                            description: design.description
                          })}
                          title="Load Design"
                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteDesign(design.id)}
                          title="Delete"
                          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {design.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{design.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}