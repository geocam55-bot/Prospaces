import React, { useState, useEffect } from 'react';
import { GarageConfig, SavedGarageDesign } from '../../types/garage';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FileText, Trash2, Download, Save } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface SavedGarageDesignsProps {
  currentConfig: GarageConfig;
  onLoadDesign: (config: GarageConfig) => void;
}

export function SavedGarageDesigns({ currentConfig, onLoadDesign }: SavedGarageDesignsProps) {
  const [designs, setDesigns] = useState<SavedGarageDesign[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    loadDesigns();
  }, []);

  const loadDesigns = () => {
    try {
      const saved = localStorage.getItem('prospacescrm_garage_designs');
      if (saved) {
        setDesigns(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved designs:', error);
    }
  };

  const saveDesign = () => {
    if (!saveName.trim()) {
      setSaveMessage('Please enter a name for your design');
      return;
    }

    const newDesign: SavedGarageDesign = {
      id: Date.now().toString(),
      name: saveName.trim(),
      config: currentConfig,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedDesigns = [...designs, newDesign];
    
    try {
      localStorage.setItem('prospacescrm_garage_designs', JSON.stringify(updatedDesigns));
      setDesigns(updatedDesigns);
      setSaveName('');
      setSaveMessage('Design saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Error saving design. Please try again.');
      console.error('Error saving design:', error);
    }
  };

  const deleteDesign = (id: string) => {
    const updatedDesigns = designs.filter((d) => d.id !== id);
    
    try {
      localStorage.setItem('prospacescrm_garage_designs', JSON.stringify(updatedDesigns));
      setDesigns(updatedDesigns);
    } catch (error) {
      console.error('Error deleting design:', error);
    }
  };

  const exportDesign = (design: SavedGarageDesign) => {
    const dataStr = JSON.stringify(design, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `garage-design-${design.name.replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Save Current Design */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="w-4 h-4" />
            Save Current Design
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="saveName">Design Name</Label>
            <Input
              id="saveName"
              placeholder="e.g., Client Smith - 24x24 Double Garage"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && saveDesign()}
            />
          </div>
          
          {saveMessage && (
            <Alert className={saveMessage.includes('success') ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
              <AlertDescription className={saveMessage.includes('success') ? 'text-green-800' : 'text-yellow-800'}>
                {saveMessage}
              </AlertDescription>
            </Alert>
          )}
          
          <Button onClick={saveDesign} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Save Design
          </Button>
          
          <div className="text-xs text-slate-500 space-y-1">
            <p>• Designs are saved to your browser's local storage</p>
            <p>• Current configuration: {currentConfig.width}' × {currentConfig.length}' {currentConfig.bays}-bay garage</p>
          </div>
        </CardContent>
      </Card>

      {/* Saved Designs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Saved Designs ({designs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {designs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No saved designs yet</p>
              <p className="text-sm mt-1">Save your first design above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {designs.map((design) => (
                <div
                  key={design.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{design.name}</h3>
                      <div className="text-sm text-slate-600 mt-1">
                        {design.config.width}' × {design.config.length}' • {design.config.bays}-bay • {design.config.roofStyle} roof
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Saved {new Date(design.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onLoadDesign(design.config)}
                    >
                      Load Design
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportDesign(design)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => deleteDesign(design.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
